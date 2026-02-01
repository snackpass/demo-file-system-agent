'use client';

import { useState, useEffect, useCallback } from 'react';
import { Chat } from '@/components/chat';
import { FileBrowser, FileNode } from '@/components/file-browser';
import { FileViewer } from '@/components/file-viewer';
import { UserSettings } from '@/components/user-settings';
import { useChat } from '@/hooks/useChat';
import { SYSTEM_PROMPT_DISPLAY } from '@/lib/constants';

const SANDBOX_ID_KEY = 'exec-assistant-sandbox-id';
const USER_NAME_KEY = 'exec-assistant-user-name';
const SYSTEM_PROMPT_KEY = 'exec-assistant-system-prompt';

// Convert FileNode tree to a string representation
function filesToTreeString(nodes: FileNode[], indent = ''): string {
  let result = '';
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const isLast = i === nodes.length - 1;
    const prefix = isLast ? '└── ' : '├── ';
    const childIndent = indent + (isLast ? '    ' : '│   ');

    result += `${indent}${prefix}${node.name}${node.type === 'directory' ? '/' : ''}\n`;

    if (node.children && node.children.length > 0) {
      result += filesToTreeString(node.children, childIndent);
    }
  }
  return result;
}

export default function Home() {
  const [files, setFiles] = useState<FileNode[]>([]);
  const [sandboxId, setSandboxId] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [systemPrompt, setSystemPrompt] = useState(SYSTEM_PROMPT_DISPLAY);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [isLoadingFileContent, setIsLoadingFileContent] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const handleFilesUpdate = useCallback((newFiles: FileNode[]) => {
    setFiles(newFiles);
  }, []);

  const handleSandboxIdChange = useCallback((newSandboxId: string) => {
    setSandboxId(newSandboxId);
    localStorage.setItem(SANDBOX_ID_KEY, newSandboxId);
  }, []);

  const {
    messages,
    streamingBlocks,
    status,
    isLoading,
    sendMessage,
    clearMessages,
  } = useChat({
    onFilesUpdate: handleFilesUpdate,
    onSandboxIdChange: handleSandboxIdChange,
  });

  // Load from localStorage on mount
  useEffect(() => {
    const storedSandboxId = localStorage.getItem(SANDBOX_ID_KEY);
    const storedUserName = localStorage.getItem(USER_NAME_KEY);
    const storedSystemPrompt = localStorage.getItem(SYSTEM_PROMPT_KEY);

    if (storedSandboxId) {
      setSandboxId(storedSandboxId);
    }
    if (storedUserName) {
      setUserName(storedUserName);
    }
    if (storedSystemPrompt) {
      setSystemPrompt(storedSystemPrompt);
    }
    setInitialized(true);
  }, []);

  // Check sandbox health and load files on mount
  useEffect(() => {
    if (!initialized || !sandboxId) return;

    const checkSandbox = async () => {
      try {
        setIsLoadingFiles(true);
        const response = await fetch(`/api/sandbox?sandboxId=${sandboxId}`);
        const data = await response.json();

        if (!data.healthy) {
          // Sandbox is dead, clear it
          localStorage.removeItem(SANDBOX_ID_KEY);
          setSandboxId(null);
          setFiles([]);
        } else {
          // Load files
          const filesResponse = await fetch(`/api/files?sandboxId=${sandboxId}`);
          const filesData = await filesResponse.json();
          if (filesData.files) {
            setFiles(filesData.files);
          }
        }
      } catch {
        // Sandbox unavailable
        localStorage.removeItem(SANDBOX_ID_KEY);
        setSandboxId(null);
      } finally {
        setIsLoadingFiles(false);
      }
    };

    checkSandbox();
  }, [initialized, sandboxId]);

  // Save userName to localStorage
  const handleNameChange = useCallback((name: string) => {
    setUserName(name);
    localStorage.setItem(USER_NAME_KEY, name);
  }, []);

  // Save system prompt to localStorage
  const handleSystemPromptChange = useCallback((prompt: string) => {
    setSystemPrompt(prompt);
    localStorage.setItem(SYSTEM_PROMPT_KEY, prompt);
  }, []);

  // Send message to agent
  const handleSendMessage = useCallback(
    async (message: string) => {
      // Generate directory snapshot if files exist
      const directorySnapshot = files.length > 0
        ? `/home/user/\n${filesToTreeString(files)}`
        : undefined;
      await sendMessage(message, sandboxId, userName, systemPrompt, directorySnapshot);
    },
    [sendMessage, sandboxId, userName, systemPrompt, files]
  );

  // Clear chat only (keep files)
  const handleClearChat = useCallback(() => {
    clearMessages();
  }, [clearMessages]);

  // Reset everything (kill sandbox, clear state, reset system prompt)
  const handleResetSession = useCallback(async () => {
    if (sandboxId) {
      try {
        await fetch(`/api/sandbox?sandboxId=${sandboxId}`, { method: 'DELETE' });
      } catch {
        // Ignore errors
      }
    }

    localStorage.removeItem(SANDBOX_ID_KEY);
    localStorage.removeItem(SYSTEM_PROMPT_KEY);
    setSandboxId(null);
    setSystemPrompt(SYSTEM_PROMPT_DISPLAY); // Reset to default
    clearMessages();
    setFiles([]);
    setSelectedFile(null);
    setFileContent('');
  }, [sandboxId, clearMessages]);

  // Load file content when selected
  const handleFileSelect = useCallback(
    async (path: string) => {
      if (!sandboxId) return;

      setSelectedFile(path);
      setIsLoadingFileContent(true);

      try {
        const response = await fetch(
          `/api/files?sandboxId=${sandboxId}&path=${encodeURIComponent(path)}`
        );
        const data = await response.json();
        setFileContent(data.content || '');
      } catch {
        setFileContent('Error loading file');
      } finally {
        setIsLoadingFileContent(false);
      }
    },
    [sandboxId]
  );

  const handleCloseFileViewer = useCallback(() => {
    setSelectedFile(null);
    setFileContent('');
  }, []);

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-gray-900">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-lg font-semibold">Executive Assistant</h1>
        <UserSettings
          userName={userName}
          onNameChange={handleNameChange}
          onClearChat={handleClearChat}
          onResetSession={handleResetSession}
        />
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - File Browser */}
        <aside className="w-64 border-r border-gray-200 dark:border-gray-700 flex-shrink-0">
          <FileBrowser
            files={files}
            onFileSelect={handleFileSelect}
            selectedFile={selectedFile}
            isLoading={isLoadingFiles}
            systemPrompt={systemPrompt}
            onSystemPromptChange={handleSystemPromptChange}
          />
        </aside>

        {/* Chat area */}
        <main className="flex-1 flex flex-col">
          <Chat
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            streamingBlocks={streamingBlocks}
            status={status}
          />
        </main>
      </div>

      {/* File Viewer Modal */}
      <FileViewer
        path={selectedFile}
        content={fileContent}
        isLoading={isLoadingFileContent}
        onClose={handleCloseFileViewer}
      />
    </div>
  );
}
