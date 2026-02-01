'use client';

import { useState } from 'react';

interface UserSettingsProps {
  userName: string;
  onNameChange: (name: string) => void;
  onResetSession: () => void;
  onClearChat: () => void;
}

export function UserSettings({
  userName,
  onNameChange,
  onResetSession,
  onClearChat,
}: UserSettingsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState(userName);

  const handleSave = () => {
    onNameChange(tempName);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTempName(userName);
    setIsEditing(false);
  };

  return (
    <div className="flex items-center gap-4">
      {isEditing ? (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={tempName}
            onChange={(e) => setTempName(e.target.value)}
            className="px-2 py-1 text-sm border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-800"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
              if (e.key === 'Escape') handleCancel();
            }}
          />
          <button
            onClick={handleSave}
            className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Save
          </button>
          <button
            onClick={handleCancel}
            className="px-2 py-1 text-xs bg-gray-300 text-gray-700 rounded hover:bg-gray-400 dark:bg-gray-600 dark:text-gray-200"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setIsEditing(true)}
          className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
        >
          {userName || 'Set name'}
        </button>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={onClearChat}
          className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
        >
          Clear Chat
        </button>
        <button
          onClick={onResetSession}
          className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 dark:bg-red-900 dark:text-red-300 dark:hover:bg-red-800"
        >
          Reset All
        </button>
      </div>
    </div>
  );
}
