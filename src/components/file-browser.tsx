'use client';

import { useState } from 'react';
import { ChevronRight, File, Folder } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}

interface FileBrowserProps {
  files: FileNode[];
  onFileSelect?: (path: string) => void;
  selectedFile?: string | null;
  isLoading?: boolean;
  systemPrompt?: string;
}

function FileTreeNode({
  node,
  depth = 0,
  onFileSelect,
  selectedFile,
}: {
  node: FileNode;
  depth?: number;
  onFileSelect?: (path: string) => void;
  selectedFile?: string | null;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const isSelected = selectedFile === node.path;

  const handleClick = () => {
    if (node.type === 'directory') {
      setIsExpanded(!isExpanded);
    } else {
      onFileSelect?.(node.path);
    }
  };

  return (
    <div>
      <div
        className={`flex items-center gap-2 py-1.5 px-2 cursor-pointer rounded-md transition-colors hover:bg-sidebar-accent ${
          isSelected ? 'bg-sidebar-accent text-sidebar-accent-foreground' : ''
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={handleClick}
      >
        {node.type === 'directory' ? (
          <ChevronRight
            className={`h-4 w-4 text-sidebar-foreground/50 transition-transform ${
              isExpanded ? 'rotate-90' : ''
            }`}
          />
        ) : (
          <span className="w-4" />
        )}
        {node.type === 'directory' ? (
          <Folder className="h-4 w-4 text-amber-500" />
        ) : (
          <File className="h-4 w-4 text-sidebar-foreground/60" />
        )}
        <span className="text-sm truncate">{node.name}</span>
      </div>
      {node.type === 'directory' && isExpanded && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              onFileSelect={onFileSelect}
              selectedFile={selectedFile}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FileBrowser({
  files,
  onFileSelect,
  selectedFile,
  isLoading,
  systemPrompt,
}: FileBrowserProps) {
  return (
    <div className="h-full flex flex-col bg-sidebar text-sidebar-foreground">
      <Tabs defaultValue="files" className="flex-1 flex flex-col">
        <TabsList className="w-full rounded-none border-b border-sidebar-border bg-transparent p-0">
          <TabsTrigger
            value="files"
            className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-sidebar-primary data-[state=active]:bg-transparent"
          >
            Files
          </TabsTrigger>
          <TabsTrigger
            value="prompt"
            className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-sidebar-primary data-[state=active]:bg-transparent"
          >
            System Prompt
          </TabsTrigger>
        </TabsList>

        <TabsContent value="files" className="flex-1 m-0">
          <ScrollArea className="h-full">
            <div className="p-2">
              {isLoading ? (
                <div className="flex items-center justify-center h-20">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-sidebar-primary"></div>
                </div>
              ) : files.length === 0 ? (
                <p className="text-sm text-sidebar-foreground/60 p-2">No files yet</p>
              ) : (
                files.map((node) => (
                  <FileTreeNode
                    key={node.path}
                    node={node}
                    onFileSelect={onFileSelect}
                    selectedFile={selectedFile}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="prompt" className="flex-1 m-0">
          <ScrollArea className="h-full">
            <div className="p-4">
              <pre className="text-xs text-sidebar-foreground/80 whitespace-pre-wrap font-mono leading-relaxed">
                {systemPrompt || 'No system prompt configured'}
              </pre>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
