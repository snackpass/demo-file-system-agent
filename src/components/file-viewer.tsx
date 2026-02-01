'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useIsMobile } from '@/hooks/use-mobile';
import ReactMarkdown from 'react-markdown';

interface FileViewerProps {
  path: string | null;
  content: string;
  isLoading: boolean;
  onClose: () => void;
}

function FileContent({ content, path, isLoading }: { content: string; path: string; isLoading: boolean }) {
  const isMarkdown = path.endsWith('.md') || path.endsWith('.mdx');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-20">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isMarkdown) {
    return (
      <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-code:text-foreground prose-pre:bg-muted prose-pre:text-foreground">
        <ReactMarkdown>{content || '(empty file)'}</ReactMarkdown>
      </div>
    );
  }

  return (
    <pre className="text-xs sm:text-sm whitespace-pre-wrap font-mono break-all">
      {content || '(empty file)'}
    </pre>
  );
}

export function FileViewer({ path, content, isLoading, onClose }: FileViewerProps) {
  const isMobile = useIsMobile();

  if (!path) return null;

  const fileName = path.split('/').pop() || path;

  // Mobile: Bottom sheet
  if (isMobile) {
    return (
      <Sheet open={!!path} onOpenChange={(open) => !open && onClose()}>
        <SheetContent side="bottom" className="max-h-[85vh] flex flex-col p-0" aria-describedby={undefined}>
          <SheetHeader className="px-4 py-3 border-b flex-shrink-0">
            <SheetTitle className="truncate pr-8 text-sm">{fileName}</SheetTitle>
          </SheetHeader>

          <ScrollArea className="flex-1 min-h-0">
            <div className="p-3">
              <FileContent content={content} path={path} isLoading={isLoading} />
            </div>
          </ScrollArea>

          <div className="px-4 py-2 border-t text-xs text-muted-foreground truncate flex-shrink-0">
            {path}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: Centered dialog
  return (
    <Dialog open={!!path} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[85vh] flex flex-col p-0" aria-describedby={undefined}>
        <DialogHeader className="px-4 py-3 border-b flex-shrink-0">
          <DialogTitle className="truncate pr-8 text-sm sm:text-base">{fileName}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="p-3 sm:p-4">
            <FileContent content={content} path={path} isLoading={isLoading} />
          </div>
        </ScrollArea>

        <div className="px-4 py-2 border-t text-xs text-muted-foreground truncate flex-shrink-0">
          {path}
        </div>
      </DialogContent>
    </Dialog>
  );
}
