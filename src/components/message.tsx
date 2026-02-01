'use client';

import ReactMarkdown from 'react-markdown';

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

function getToolDisplayName(toolName: string): string {
  switch (toolName) {
    case 'write_file':
      return 'write';
    case 'read_file':
      return 'read';
    case 'run_command':
      return 'command';
    case 'list_directory':
      return 'list';
    default:
      return toolName;
  }
}

export function Message({ role, content, toolCalls }: MessageProps) {
  const isUser = role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-[80%] rounded-lg px-4 py-2 ${
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
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
                <span>{getToolDisplayName(tool.name)}</span>
              </span>
            ))}
          </div>
        )}

        {/* Message content */}
        {isUser ? (
          <p className="text-sm whitespace-pre-wrap">{content}</p>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-pre:my-2 prose-pre:bg-gray-200 dark:prose-pre:bg-gray-700 prose-code:text-pink-600 dark:prose-code:text-pink-400">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
