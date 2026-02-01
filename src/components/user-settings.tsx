'use client';

import { useState } from 'react';
import { User, Trash2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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
    <div className="flex items-center gap-2 sm:gap-4">
      {isEditing ? (
        <div className="flex items-center gap-2">
          <Input
            type="text"
            value={tempName}
            onChange={(e) => setTempName(e.target.value)}
            className="h-8 w-32 sm:w-40"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
              if (e.key === 'Escape') handleCancel();
            }}
          />
          <Button onClick={handleSave} size="sm" className="h-8">
            Save
          </Button>
          <Button onClick={handleCancel} size="sm" variant="outline" className="h-8">
            Cancel
          </Button>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsEditing(true)}
          className="text-muted-foreground"
        >
          <User className="h-4 w-4 mr-1 sm:mr-2" />
          <span className="hidden sm:inline">{userName || 'Set name'}</span>
          <span className="sm:hidden">{userName ? userName.slice(0, 8) : 'Name'}</span>
        </Button>
      )}

      <div className="flex items-center gap-1 sm:gap-2">
        <Button
          onClick={onClearChat}
          size="sm"
          variant="outline"
          className="h-8"
        >
          <Trash2 className="h-4 w-4 sm:mr-1" />
          <span className="hidden sm:inline">Clear Chat</span>
        </Button>
        <Button
          onClick={onResetSession}
          size="sm"
          variant="destructive"
          className="h-8"
        >
          <RotateCcw className="h-4 w-4 sm:mr-1" />
          <span className="hidden sm:inline">Reset All</span>
        </Button>
      </div>
    </div>
  );
}
