'use client';

import { useState, useEffect, useCallback } from 'react';
import { Chat } from '@/components/chat';
import { FileBrowser, FileNode } from '@/components/file-browser';
import { FileViewer } from '@/components/file-viewer';
import { UserSettings } from '@/components/user-settings';
import { MessageProps } from '@/components/message';

const SANDBOX_ID_KEY = 'exec-assistant-sandbox-id';
const USER_NAME_KEY = 'exec-assistant-user-name';

export default function Home() {
  const [messages, setMessages] = useState<MessageProps[]>([]);
  const [files, setFiles] = useState<FileNode[]>([]);
  const [sandboxId, setSandboxId] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [isLoadingFileContent, setIsLoadingFileContent] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const storedSandboxId = localStorage.getItem(SANDBOX_ID_KEY);
    const storedUserName = localStorage.getItem(USER_NAME_KEY);

    if (storedSandboxId) {
      setSandboxId(storedSandboxId);
    }
    if (storedUserName) {
      setUserName(storedUserName);
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

  // Send message to agent
  const handleSendMessage = useCallback(
    async (message: string) => {
      setIsLoading(true);
      setMessages((prev) => [...prev, { role: 'user', content: message }]);

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message,
            sandboxId,
            userName: userName || 'User',
          }),
        });

        const data = await response.json();

        if (data.error) {
          setMessages((prev) => [
            ...prev,
            { role: 'assistant', content: `Error: ${data.error}` },
          ]);
        } else {
          setMessages((prev) => [
            ...prev,
            { role: 'assistant', content: data.response },
          ]);

          // Update sandbox ID if new
          if (data.sandboxId && data.sandboxId !== sandboxId) {
            setSandboxId(data.sandboxId);
            localStorage.setItem(SANDBOX_ID_KEY, data.sandboxId);
          }

          // Update files
          if (data.files) {
            setFiles(data.files);
          }
        }
      } catch (error) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: `Error: ${error instanceof Error ? error.message : 'Failed to send message'}`,
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [sandboxId, userName]
  );

  // Clear chat only (keep files)
  const handleClearChat = useCallback(() => {
    setMessages([]);
  }, []);

  // Reset everything (kill sandbox, clear state)
  const handleResetSession = useCallback(async () => {
    if (sandboxId) {
      try {
        await fetch(`/api/sandbox?sandboxId=${sandboxId}`, { method: 'DELETE' });
      } catch {
        // Ignore errors
      }
    }

    localStorage.removeItem(SANDBOX_ID_KEY);
    setSandboxId(null);
    setMessages([]);
    setFiles([]);
    setSelectedFile(null);
    setFileContent('');
  }, [sandboxId]);

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
          />
        </aside>

        {/* Chat area */}
        <main className="flex-1 flex flex-col">
          <Chat
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
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
