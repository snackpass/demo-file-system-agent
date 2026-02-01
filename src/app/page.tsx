'use client';

import { useState, useEffect, useCallback } from 'react';
import { Menu } from 'lucide-react';
import { Chat } from '@/components/chat';
import { FileBrowser, FileNode } from '@/components/file-browser';
import { FileViewer } from '@/components/file-viewer';
import { UserSettings } from '@/components/user-settings';
import { useChat } from '@/hooks/useChat';
import { SYSTEM_PROMPT_DISPLAY } from '@/lib/system-prompt';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { ThemeToggle } from '@/components/theme-toggle';

const SANDBOX_ID_KEY = 'exec-assistant-sandbox-id';
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
  const [systemPrompt, setSystemPrompt] = useState(SYSTEM_PROMPT_DISPLAY);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [isLoadingFileContent, setIsLoadingFileContent] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
    const storedSystemPrompt = localStorage.getItem(SYSTEM_PROMPT_KEY);

    if (storedSandboxId) {
      setSandboxId(storedSandboxId);
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
          localStorage.removeItem(SANDBOX_ID_KEY);
          setSandboxId(null);
          setFiles([]);
        } else {
          const filesResponse = await fetch(`/api/files?sandboxId=${sandboxId}`);
          const filesData = await filesResponse.json();
          if (filesData.files) {
            setFiles(filesData.files);
          }
        }
      } catch {
        localStorage.removeItem(SANDBOX_ID_KEY);
        setSandboxId(null);
      } finally {
        setIsLoadingFiles(false);
      }
    };

    checkSandbox();
  }, [initialized, sandboxId]);


  // Save system prompt to localStorage
  const handleSystemPromptChange = useCallback((prompt: string) => {
    setSystemPrompt(prompt);
    localStorage.setItem(SYSTEM_PROMPT_KEY, prompt);
  }, []);

  // Send message to agent with streaming
  const handleSendMessage = useCallback(
    async (message: string) => {
      // Generate directory snapshot if files exist
      const directorySnapshot = files.length > 0
        ? `/home/user/\n${filesToTreeString(files)}`
        : undefined;
      await sendMessage(message, sandboxId, systemPrompt, directorySnapshot);
    },
    [sendMessage, sandboxId, systemPrompt, files]
  );

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
    setSystemPrompt(SYSTEM_PROMPT_DISPLAY);
    clearMessages();
    setFiles([]);
    setSelectedFile(null);
    setFileContent('');
  }, [sandboxId, clearMessages]);

  const handleFileSelect = useCallback(
    async (path: string) => {
      if (!sandboxId) return;

      setSelectedFile(path);
      setIsLoadingFileContent(true);
      setSidebarOpen(false);

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

  const sidebarContent = (
    <FileBrowser
      files={files}
      onFileSelect={handleFileSelect}
      selectedFile={selectedFile}
      isLoading={isLoadingFiles}
      systemPrompt={systemPrompt}
      onSystemPromptChange={handleSystemPromptChange}
    />
  );

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          {/* Mobile menu button */}
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0" aria-describedby={undefined}>
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              {sidebarContent}
            </SheetContent>
          </Sheet>
          <h1 className="text-lg font-semibold">Executive Assistant</h1>
        </div>
        <div className="flex items-center gap-2">
          <UserSettings
            onClearChat={handleClearChat}
            onResetSession={handleResetSession}
          />
          <ThemeToggle />
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Desktop only */}
        <aside className="hidden md:block w-64 border-r flex-shrink-0">
          {sidebarContent}
        </aside>

        {/* Chat area */}
        <main className="flex-1 flex flex-col min-w-0">
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
