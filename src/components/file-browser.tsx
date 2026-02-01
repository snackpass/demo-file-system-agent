'use client';

import { useState } from 'react';

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

function FileIcon({ type }: { type: 'file' | 'directory' }) {
  if (type === 'directory') {
    return (
      <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
        <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
      </svg>
    );
  }
  return (
    <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
        clipRule="evenodd"
      />
    </svg>
  );
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
        className={`flex items-center gap-2 py-1 px-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded ${
          isSelected ? 'bg-blue-100 dark:bg-blue-900' : ''
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={handleClick}
      >
        {node.type === 'directory' && (
          <svg
            className={`w-3 h-3 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
              clipRule="evenodd"
            />
          </svg>
        )}
        {node.type === 'file' && <span className="w-3" />}
        <FileIcon type={node.type} />
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
  onSystemPromptChange,
}: FileBrowserProps) {
  const [activeTab, setActiveTab] = useState<'files' | 'prompt'>('files');
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
      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('files')}
          className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === 'files'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50 dark:bg-blue-900/20'
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          Files
        </button>
        <button
          onClick={() => setActiveTab('prompt')}
          className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === 'prompt'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50 dark:bg-blue-900/20'
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          System Prompt
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'files' ? (
          <div className="p-2">
            {isLoading ? (
              <div className="flex items-center justify-center h-20">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            ) : files.length === 0 ? (
              <p className="text-sm text-gray-500 p-2">No files yet</p>
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
        ) : (
          <div className="p-3 flex flex-col h-full">
            {isEditing ? (
              <>
                <textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="flex-1 min-h-[200px] text-xs font-mono p-2 border border-gray-300 dark:border-gray-600 rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100"
                  placeholder="Enter system prompt..."
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={handleSave}
                    className="flex-1 px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Save
                  </button>
                  <button
                    onClick={handleCancel}
                    className="flex-1 px-3 py-1.5 text-xs bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <pre className="flex-1 text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap font-mono leading-relaxed overflow-auto">
                  {systemPrompt || 'No system prompt configured'}
                </pre>
                {onSystemPromptChange && (
                  <button
                    onClick={handleEdit}
                    className="mt-2 px-3 py-1.5 text-xs bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                  >
                    Edit Prompt
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
