'use client';

import { useState } from 'react';
import { ChevronRight, File, Folder } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

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
  onSystemPromptChange?: (prompt: string) => void;
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
      <button
        type="button"
        className={`flex items-center gap-2 py-1.5 px-2 w-full text-left rounded-md transition-colors hover:bg-accent ${
          isSelected ? 'bg-accent text-accent-foreground' : ''
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={handleClick}
      >
        {node.type === 'directory' ? (
          <ChevronRight
            className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${
              isExpanded ? 'rotate-90' : ''
            }`}
          />
        ) : (
          <span className="w-4 shrink-0" />
        )}
        {node.type === 'directory' ? (
          <Folder className="h-4 w-4 text-amber-500 shrink-0" />
        ) : (
          <File className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
        <span className="text-sm truncate">{node.name}</span>
      </button>
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
  onSystemPromptChange,
}: FileBrowserProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(systemPrompt || '');

  const handleEdit = () => {
    setEditValue(systemPrompt || '');
    setIsEditing(true);
  };

  const handleSave = () => {
    onSystemPromptChange?.(editValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(systemPrompt || '');
    setIsEditing(false);
  };

  return (
    <div className="h-full flex flex-col">
      <Tabs defaultValue="files" className="flex-1 flex flex-col min-h-0">
        <div className="p-2 border-b shrink-0">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="files">
              Files
            </TabsTrigger>
            <TabsTrigger value="prompt">
              Prompt
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="files" className="flex-1 m-0 min-h-0">
          <ScrollArea className="h-full">
            <div className="p-2">
              {isLoading ? (
                <div className="flex items-center justify-center h-20">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent"></div>
                </div>
              ) : files.length === 0 ? (
                <p className="text-sm text-muted-foreground px-2 py-4 text-center">No files yet</p>
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

        <TabsContent value="prompt" className="flex-1 m-0 flex flex-col min-h-0 overflow-hidden">
          {isEditing ? (
            <div className="flex-1 flex flex-col p-3 gap-2 min-h-0 overflow-hidden">
              <ScrollArea className="flex-1 min-h-0">
                <Textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="min-h-[200px] text-xs font-mono"
                  placeholder="Enter system prompt..."
                />
              </ScrollArea>
              <div className="flex gap-2 shrink-0">
                <Button onClick={handleSave} size="sm" className="flex-1">
                  Save
                </Button>
                <Button onClick={handleCancel} size="sm" variant="outline" className="flex-1">
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <ScrollArea className="flex-1 min-h-0">
              <div className="p-3">
                <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed">
                  {systemPrompt || 'No system prompt configured'}
                </pre>
                {onSystemPromptChange && (
                  <Button onClick={handleEdit} size="sm" variant="outline" className="mt-3 w-full">
                    Edit Prompt
                  </Button>
                )}
              </div>
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
