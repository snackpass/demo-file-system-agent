import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { Sandbox } from 'e2b';
import { WORKSPACE_PATH } from '@/lib/constants';
import { SYSTEM_PROMPT } from '@/lib/system-prompt';
import { listFiles } from '@/lib/e2b';

const anthropic = new Anthropic();

// SSE helper
function encodeSSE(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

// Define tools for the agent
const tools: Anthropic.Tool[] = [
  {
    name: 'run_command',
    description:
      'Run a shell command in the sandbox. Use this for file operations like creating directories, listing files, etc.',
    input_schema: {
      type: 'object' as const,
      properties: {
        command: {
          type: 'string',
          description: 'The shell command to run',
        },
      },
      required: ['command'],
    },
  },
  {
    name: 'write_file',
    description:
      'Write content to a file. Creates the file if it does not exist, or overwrites if it does.',
    input_schema: {
      type: 'object' as const,
      properties: {
        path: {
          type: 'string',
          description: 'The absolute path to the file (should start with /home/user)',
        },
        content: {
          type: 'string',
          description: 'The content to write to the file',
        },
      },
      required: ['path', 'content'],
    },
  },
  {
    name: 'read_file',
    description: 'Read the contents of a file.',
    input_schema: {
      type: 'object' as const,
      properties: {
        path: {
          type: 'string',
          description: 'The absolute path to the file to read',
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'list_directory',
    description: 'List the contents of a directory.',
    input_schema: {
      type: 'object' as const,
      properties: {
        path: {
          type: 'string',
          description: 'The absolute path to the directory (defaults to /home/user)',
        },
      },
      required: [],
    },
  },
];

async function executeTool(
  sandbox: Sandbox,
  toolName: string,
  toolInput: Record<string, unknown>
): Promise<string> {
  try {
    switch (toolName) {
      case 'run_command': {
        const result = await sandbox.commands.run(toolInput.command as string);
        return result.stdout + (result.stderr ? `\nStderr: ${result.stderr}` : '');
      }
      case 'write_file': {
        const path = toolInput.path as string;
        const content = toolInput.content as string;
        // Ensure parent directory exists
        const dir = path.substring(0, path.lastIndexOf('/'));
        if (dir) {
          await sandbox.commands.run(`mkdir -p "${dir}"`);
        }
        await sandbox.files.write(path, content);
        return `Successfully wrote to ${path}`;
      }
      case 'read_file': {
        const content = await sandbox.files.read(toolInput.path as string);
        return content || '(empty file)';
      }
      case 'list_directory': {
        const path = (toolInput.path as string) || WORKSPACE_PATH;
        const result = await sandbox.commands.run(`ls -la "${path}"`);
        return result.stdout || 'Directory is empty';
      }
      default:
        return `Unknown tool: ${toolName}`;
    }
  } catch (error) {
    return `Error: ${error instanceof Error ? error.message : String(error)}`;
  }
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  const body = await request.json();
  const { message, sandboxId, history = [], customSystemPrompt, directorySnapshot } = body;

  if (!message) {
    return new Response(
      encoder.encode(encodeSSE('error', { error: 'Message is required' })),
      {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      }
    );
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Send connecting status
        controller.enqueue(encoder.encode(encodeSSE('status', { status: 'connecting' })));

        // Create or connect to sandbox (connect auto-resumes paused sandboxes)
        let sandbox: Sandbox;
        let newSandboxId = sandboxId;

        // Try connecting to existing sandbox (works for both running and paused)
        if (sandboxId) {
          try {
            sandbox = await Sandbox.connect(sandboxId);
          } catch {
            // Sandbox expired or unavailable, create new one with autoPause
            // autoPause: sandbox will pause (not die) after timeout, can be resumed later
            sandbox = await Sandbox.create('base', {
              timeoutMs: 24 * 60 * 60 * 1000,  // 24 hour timeout
            });
            newSandboxId = sandbox.sandboxId;
            await sandbox.commands.run(`mkdir -p ${WORKSPACE_PATH}`);
          }
        } else {
          // Fresh start with autoPause enabled
          sandbox = await Sandbox.create('base', {
            timeoutMs: 24 * 60 * 60 * 1000,  // 24 hour timeout
          });
          newSandboxId = sandbox.sandboxId;
          await sandbox.commands.run(`mkdir -p ${WORKSPACE_PATH}`);
        }

        controller.enqueue(encoder.encode(encodeSSE('status', { status: 'sandbox_ready' })));

        // Use custom prompt if provided, otherwise use default
        let systemPrompt = customSystemPrompt || SYSTEM_PROMPT;

        // Add technical instructions if using custom prompt
        if (customSystemPrompt) {
          systemPrompt += `\n\nIMPORTANT: You are operating in a sandbox filesystem. The workspace is at /home/user. Always save files there.\nWhen you create or modify files, use absolute paths starting with /home/user.`;
        }

        // Add directory snapshot if provided
        if (directorySnapshot) {
          systemPrompt += `\n\n## Current Directory Structure\nHere is the current state of the workspace:\n\`\`\`\n${directorySnapshot}\n\`\`\``;
        }

        // Build messages from history + new message
        const messages: Anthropic.MessageParam[] = [
          ...history.map((msg: { role: string; content: string }) => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
          })),
          { role: 'user', content: message },
        ];

        // Track all tool calls for the final response
        const allToolCalls: Array<{ name: string; input: Record<string, unknown> }> = [];

        // Use streaming API for first request
        controller.enqueue(encoder.encode(encodeSSE('status', { status: 'thinking' })));

        const anthropicStream = anthropic.messages.stream({
          model: 'claude-opus-4-5-20251101',
          max_tokens: 4096,
          system: systemPrompt,
          tools,
          messages,
        });

        // Stream text deltas
        for await (const event of anthropicStream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(encodeSSE('delta', { text: event.delta.text })));
          }
        }

        let response = await anthropicStream.finalMessage();

        // Agentic loop - keep processing until we get a final response
        while (response.stop_reason === 'tool_use') {
          const assistantMessage: Anthropic.MessageParam = {
            role: 'assistant',
            content: response.content,
          };
          messages.push(assistantMessage);

          // Process tool calls
          const toolResults: Anthropic.ToolResultBlockParam[] = [];
          for (const block of response.content) {
            if (block.type === 'tool_use') {
              // Send tool use event
              controller.enqueue(
                encoder.encode(
                  encodeSSE('tool_use', {
                    id: block.id,
                    name: block.name,
                    input: block.input,
                  })
                )
              );

              // Track tool call
              allToolCalls.push({
                name: block.name,
                input: block.input as Record<string, unknown>,
              });

              // Execute tool
              const result = await executeTool(
                sandbox,
                block.name,
                block.input as Record<string, unknown>
              );

              // Send tool result event
              controller.enqueue(
                encoder.encode(
                  encodeSSE('tool_result', {
                    id: block.id,
                    name: block.name,
                  })
                )
              );

              toolResults.push({
                type: 'tool_result',
                tool_use_id: block.id,
                content: result,
              });
            }
          }

          messages.push({
            role: 'user',
            content: toolResults,
          });

          // Continue with streaming for next response
          const nextStream = anthropic.messages.stream({
            model: 'claude-opus-4-5-20251101',
            max_tokens: 4096,
            system: systemPrompt,
            tools,
            messages,
          });

          // Stream text deltas for this iteration
          for await (const event of nextStream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              controller.enqueue(encoder.encode(encodeSSE('delta', { text: event.delta.text })));
            }
          }

          response = await nextStream.finalMessage();
        }

        // Get updated file list
        const files = await listFiles(sandbox, WORKSPACE_PATH);

        // Send done event with files and sandbox ID
        controller.enqueue(
          encoder.encode(
            encodeSSE('done', {
              files,
              sandboxId: newSandboxId,
              toolCalls: allToolCalls,
            })
          )
        );
      } catch (error) {
        console.error('Error in chat API:', error);
        controller.enqueue(
          encoder.encode(
            encodeSSE('error', {
              error: error instanceof Error ? error.message : 'Internal server error',
            })
          )
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
