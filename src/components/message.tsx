'use client';

import ReactMarkdown from 'react-markdown';
import { Card } from '@/components/ui/card';

export interface ToolCall {
  name: string;
  input: Record<string, unknown>;
}

export interface MessageProps {
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: ToolCall[];
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
      return `wrote ${input.path}`;
    case 'read_file':
      return `read ${input.path}`;
    case 'run_command': {
      const cmd = String(input.command);
      return `ran: ${cmd.slice(0, 30)}${cmd.length > 30 ? '...' : ''}`;
    }
    case 'list_directory':
      return `listed ${input.path || '/home/user'}`;
    default:
      return toolName;
  }
}

export function Message({ role, content, toolCalls }: MessageProps) {
  const isUser = role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <Card
        className={`max-w-[85%] sm:max-w-[80%] px-4 py-2 ${
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted'
        }`}
      >
        {/* Tool calls badges */}
        {toolCalls && toolCalls.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1">
            {toolCalls.map((tool, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded"
                title={JSON.stringify(tool.input, null, 2)}
              >
                <span>{getToolIcon(tool.name)}</span>
                <span>{getToolDescription(tool.name, tool.input)}</span>
              </span>
            ))}
          </div>
        )}

        {/* Message content */}
        {isUser ? (
          <p className="text-sm whitespace-pre-wrap">{content}</p>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-pre:my-2 prose-pre:bg-background/50 prose-code:text-pink-600 dark:prose-code:text-pink-400">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        )}
      </Card>
    </div>
  );
}
