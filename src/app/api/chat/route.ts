import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { Sandbox } from 'e2b';
import { SYSTEM_PROMPT, WORKSPACE_PATH } from '@/lib/constants';
import { listFiles, FileNode } from '@/lib/e2b';

const anthropic = new Anthropic();

// Define tools for the agent
const tools: Anthropic.Tool[] = [
  {
    name: 'run_command',
    description: 'Run a shell command in the sandbox. Use this for file operations like creating directories, listing files, etc.',
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
    description: 'Write content to a file. Creates the file if it does not exist, or overwrites if it does.',
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
  try {
    const body = await request.json();
    const { message, sandboxId, userName, history = [] } = body;

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Create or connect to sandbox
    let sandbox: Sandbox;
    let newSandboxId = sandboxId;

    if (sandboxId) {
      try {
        sandbox = await Sandbox.connect(sandboxId);
      } catch {
        // Sandbox expired or unavailable, create new one
        sandbox = await Sandbox.create('base', { timeoutMs: 5 * 60 * 1000 });
        newSandboxId = sandbox.sandboxId;
        await sandbox.commands.run(`mkdir -p ${WORKSPACE_PATH}`);
      }
    } else {
      sandbox = await Sandbox.create('base', { timeoutMs: 5 * 60 * 1000 });
      newSandboxId = sandbox.sandboxId;
      await sandbox.commands.run(`mkdir -p ${WORKSPACE_PATH}`);
    }

    // Prepare system prompt with user name
    const systemPrompt = SYSTEM_PROMPT.replace('{userName}', userName || 'User');

    // Build messages from history + new message
    const messages: Anthropic.MessageParam[] = [
      ...history.map((msg: { role: string; content: string }) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      { role: 'user', content: message },
    ];

    let response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemPrompt,
      tools,
      messages,
    });

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
          const result = await executeTool(
            sandbox,
            block.name,
            block.input as Record<string, unknown>
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

      response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: systemPrompt,
        tools,
        messages,
      });
    }

    // Extract text response
    let textResponse = '';
    for (const block of response.content) {
      if (block.type === 'text') {
        textResponse += block.text;
      }
    }

    // Get updated file list
    const files = await listFiles(sandbox, WORKSPACE_PATH);

    return NextResponse.json({
      response: textResponse,
      sandboxId: newSandboxId,
      files,
    });
  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
