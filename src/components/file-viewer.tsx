'use client';

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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col m-4">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold truncate">{fileName}</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-20">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <pre className="text-sm whitespace-pre-wrap font-mono">{content || '(empty file)'}</pre>
          )}
        </div>
        <div className="p-2 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500">
          {path}
        </div>
      </div>
    </div>
  );
}
