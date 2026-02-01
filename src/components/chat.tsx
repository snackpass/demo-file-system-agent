'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Send } from 'lucide-react';
import { Message, MessageProps } from './message';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { StreamBlock } from '@/hooks/useChat';

interface ChatProps {
  messages: MessageProps[];
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  streamingBlocks?: StreamBlock[];
  status?: string;
}

function getToolIcon(toolName: string): string {
  switch (toolName) {
    case 'write_file':
      return '📝';
    case 'read_file':
      return '📖';
    case 'run_command':
      return '⚡';
    case 'list_directory':
      return '📁';
    default:
      return '🔧';
  }
}

function getToolDescription(toolName: string, input: Record<string, unknown>): string {
  switch (toolName) {
    case 'write_file':
      return `Writing to ${input.path}`;
    case 'read_file':
      return `Reading ${input.path}`;
    case 'run_command':
      return `Running: ${String(input.command).slice(0, 40)}${String(input.command).length > 40 ? '...' : ''}`;
    case 'list_directory':
      return `Listing ${input.path || '/home/user'}`;
    default:
      return toolName;
  }
}

// Render a single streaming block
function StreamBlockRenderer({ block }: { block: StreamBlock }) {
  if (block.type === 'text') {
    return (
      <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-pre:my-2 prose-pre:bg-background/50 prose-code:text-pink-600 dark:prose-code:text-pink-400">
        <ReactMarkdown>{block.content}</ReactMarkdown>
      </div>
    );
  }

  // Tool block
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground py-1">
      {block.completed ? (
        <span className="text-green-500 w-4 text-center">✓</span>
      ) : (
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
      )}
      <span>{getToolIcon(block.name)}</span>
      <span>{getToolDescription(block.name, block.input)}</span>
    </div>
  );
}

// Component for showing the in-progress streaming response
function StreamingMessage({
  blocks,
  status,
}: {
  blocks: StreamBlock[];
  status: string;
}) {
  const hasContent = blocks.length > 0 || status;

  if (!hasContent) return null;

  // Check if we're waiting for response after tools completed
  const allToolsCompleted = blocks.length > 0 &&
    blocks.every(b => b.type === 'text' || (b.type === 'tool' && b.completed));
  const lastBlock = blocks[blocks.length - 1];
  const waitingForResponse = allToolsCompleted && lastBlock?.type === 'tool';

  return (
    <div className="flex justify-start mb-4">
      <div className="max-w-[85%] sm:max-w-[80%] bg-muted rounded-lg px-4 py-2">
        {/* Status indicator (only when no blocks yet) */}
        {status && blocks.length === 0 && (
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            <span className="text-sm text-muted-foreground">{status}</span>
          </div>
        )}

        {/* Render blocks in order */}
        {blocks.map((block, index) => (
          <StreamBlockRenderer key={index} block={block} />
        ))}

        {/* Show waiting indicator if all tools completed but no final text */}
        {waitingForResponse && (
          <div className="flex items-center gap-2 mt-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            <span className="text-sm text-muted-foreground">Generating response...</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function Chat({
  messages,
  onSendMessage,
  isLoading,
  streamingBlocks = [],
  status = '',
}: ChatProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingBlocks, status]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Check if we should show the streaming message
  const showStreamingMessage = isLoading && (streamingBlocks.length > 0 || status);

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1">
        <div className="p-4">
          {messages.length === 0 && !isLoading ? (
            <div className="flex items-center justify-center h-[50vh] text-muted-foreground">
              <div className="text-center max-w-md px-4">
                <h2 className="text-xl font-semibold mb-2">Executive Assistant</h2>
                <p className="text-sm">
                  Start a conversation. Your assistant will manage files and remember context.
                </p>
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, index) => (
                <Message key={index} {...msg} />
              ))}

              {/* Streaming message with blocks in order */}
              {showStreamingMessage && (
                <StreamingMessage blocks={streamingBlocks} status={status} />
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <form onSubmit={handleSubmit} className="border-t p-4">
        <div className="flex gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground min-h-[44px]"
            rows={1}
            disabled={isLoading}
          />
          <Button
            type="submit"
            disabled={!input.trim() || isLoading}
            size="icon"
            className="h-11 w-11"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
