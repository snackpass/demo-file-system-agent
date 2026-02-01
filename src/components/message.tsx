'use client';

import ReactMarkdown from 'react-markdown';
import { Card } from '@/components/ui/card';

export interface MessageProps {
  role: 'user' | 'assistant';
  content: string;
}

export function Message({ role, content }: MessageProps) {
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
