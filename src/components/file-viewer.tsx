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

interface FileViewerProps {
  path: string | null;
  content: string;
  isLoading: boolean;
  onClose: () => void;
}

export function FileViewer({ path, content, isLoading, onClose }: FileViewerProps) {
  if (!path) return null;

  const fileName = path.split('/').pop() || path;

  return (
    <Dialog open={!!path} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-4 py-3 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="truncate pr-4">{fileName}</DialogTitle>
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

        <ScrollArea className="flex-1 max-h-[60vh]">
          <div className="p-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-20">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : (
              <pre className="text-sm whitespace-pre-wrap font-mono">
                {content || '(empty file)'}
              </pre>
            )}
          </div>
        </ScrollArea>

        <div className="px-4 py-2 border-t text-xs text-muted-foreground truncate">
          {path}
        </div>
      </DialogContent>
    </Dialog>
  );
}
