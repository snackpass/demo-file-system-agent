'use client';

import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import ReactMarkdown from 'react-markdown';

interface FileViewerProps {
  path: string | null;
  content: string;
  isLoading: boolean;
  onClose: () => void;
}

export function FileViewer({ path, content, isLoading, onClose }: FileViewerProps) {
  if (!path) return null;

  const fileName = path.split('/').pop() || path;
  const isMarkdown = path.endsWith('.md') || path.endsWith('.mdx');

  return (
    <Dialog open={!!path} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-4 py-3 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="truncate pr-4 text-sm sm:text-base">{fileName}</DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="p-3 sm:p-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-20">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : isMarkdown ? (
              <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-code:text-foreground prose-pre:bg-muted prose-pre:text-foreground">
                <ReactMarkdown>{content || '(empty file)'}</ReactMarkdown>
              </div>
            ) : (
              <pre className="text-xs sm:text-sm whitespace-pre-wrap font-mono break-all">
                {content || '(empty file)'}
              </pre>
            )}
          </div>
        </ScrollArea>

        <div className="px-4 py-2 border-t text-xs text-muted-foreground truncate flex-shrink-0">
          {path}
        </div>
      </DialogContent>
    </Dialog>
  );
}
