import { useState, useCallback, useRef } from 'react';
import { useSSE, SSEEvent } from './useSSE';
import { MessageProps } from '@/components/message';
import { FileNode } from '@/components/file-browser';

// A streaming block can be text or a tool use
export type StreamBlock =
  | { type: 'text'; content: string }
  | { type: 'tool'; id: string; name: string; input: Record<string, unknown>; completed: boolean };

export interface ToolUse {
  id: string;
  name: string;
  input: Record<string, unknown>;
  completed: boolean;
}

export interface UseChatOptions {
  onFilesUpdate?: (files: FileNode[]) => void;
  onSandboxIdChange?: (sandboxId: string) => void;
}

export function useChat(options: UseChatOptions = {}) {
  const [messages, setMessages] = useState<MessageProps[]>([]);
  const [streamingBlocks, setStreamingBlocks] = useState<StreamBlock[]>([]);
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { connect, disconnect } = useSSE();

  // Use refs to track current values for the done handler
  const streamingBlocksRef = useRef<StreamBlock[]>([]);
  const hasAddedFinalMessageRef = useRef(false);

  const handleEvent = useCallback(
    (event: SSEEvent) => {
      switch (event.event) {
        case 'status': {
          const { status: newStatus } = event.data as { status: string };
          const statusMap: Record<string, string> = {
            connecting: 'Connecting to sandbox...',
            sandbox_ready: 'Sandbox ready',
            thinking: 'Thinking...',
          };
          setStatus(statusMap[newStatus] || newStatus);
          break;
        }

        case 'delta': {
          const { text } = event.data as { text: string };

          // Append to existing text block or create new one
          const blocks = streamingBlocksRef.current;
          const lastBlock = blocks[blocks.length - 1];

          if (lastBlock && lastBlock.type === 'text') {
            // Append to existing text block
            lastBlock.content += text;
            streamingBlocksRef.current = [...blocks];
          } else {
            // Create new text block
            streamingBlocksRef.current = [...blocks, { type: 'text', content: text }];
          }

          setStreamingBlocks([...streamingBlocksRef.current]);
          setStatus(''); // Clear status when text starts streaming
          break;
        }

        case 'tool_use': {
          const { id, name, input } = event.data as {
            id: string;
            name: string;
            input: Record<string, unknown>;
          };

          // Add tool block
          const toolBlock: StreamBlock = { type: 'tool', id, name, input, completed: false };
          streamingBlocksRef.current = [...streamingBlocksRef.current, toolBlock];
          setStreamingBlocks([...streamingBlocksRef.current]);
          break;
        }

        case 'tool_result': {
          const { id } = event.data as { id: string };

          // Mark tool as completed
          streamingBlocksRef.current = streamingBlocksRef.current.map((block) =>
            block.type === 'tool' && block.id === id
              ? { ...block, completed: true }
              : block
          );
          setStreamingBlocks([...streamingBlocksRef.current]);
          break;
        }

        case 'done': {
          // Prevent double-adding message (React strict mode can cause double calls)
          if (hasAddedFinalMessageRef.current) {
            break;
          }
          hasAddedFinalMessageRef.current = true;

          const { files, sandboxId, toolCalls } = event.data as {
            files?: FileNode[];
            sandboxId?: string;
            toolCalls?: Array<{ name: string; input: Record<string, unknown> }>;
          };

          if (files) {
            options.onFilesUpdate?.(files);
          }
          if (sandboxId) {
            options.onSandboxIdChange?.(sandboxId);
          }

          // Convert streaming blocks to final message content
          const blocks = streamingBlocksRef.current;
          const textContent = blocks
            .filter((b): b is Extract<StreamBlock, { type: 'text' }> => b.type === 'text')
            .map((b) => b.content)
            .join('');

          if (textContent || (toolCalls && toolCalls.length > 0)) {
            setMessages((prev) => [
              ...prev,
              {
                role: 'assistant',
                content: textContent,
                toolCalls: toolCalls || [],
              },
            ]);
          }

          // Clear all streaming state
          streamingBlocksRef.current = [];
          setStreamingBlocks([]);
          setStatus('');
          setIsLoading(false);
          break;
        }

        case 'error': {
          const { error } = event.data as { error: string };
          setMessages((prev) => [...prev, { role: 'assistant', content: `Error: ${error}` }]);
          streamingBlocksRef.current = [];
          setStreamingBlocks([]);
          setStatus('');
          setIsLoading(false);
          break;
        }
      }
    },
    [options]
  );

  const sendMessage = useCallback(
    async (
      message: string,
      sandboxId: string | null,
      userName: string,
      customSystemPrompt?: string,
      directorySnapshot?: string
    ) => {
      // Reset all refs for new message
      streamingBlocksRef.current = [];
      hasAddedFinalMessageRef.current = false;

      setIsLoading(true);
      setStatus('Connecting...');
      setStreamingBlocks([]);

      // Add user message immediately
      setMessages((prev) => [...prev, { role: 'user', content: message }]);

      // Get current messages for history (exclude the one we just added)
      const history = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      await connect(
        '/api/chat',
        {
          message,
          sandboxId,
          userName: userName || 'User',
          history,
          customSystemPrompt,
          directorySnapshot,
        },
        {
          onEvent: handleEvent,
          onError: (error) => {
            setMessages((prev) => [
              ...prev,
              { role: 'assistant', content: `Error: ${error.message}` },
            ]);
            streamingBlocksRef.current = [];
            setIsLoading(false);
            setStatus('');
            setStreamingBlocks([]);
          },
          onComplete: () => {
            // Connection closed - loading state should already be cleared by done/error event
          },
        }
      );
    },
    [connect, handleEvent, messages]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setStreamingBlocks([]);
    setStatus('');
    streamingBlocksRef.current = [];
  }, []);

  return {
    messages,
    streamingBlocks,
    status,
    isLoading,
    sendMessage,
    clearMessages,
    disconnect,
  };
}
