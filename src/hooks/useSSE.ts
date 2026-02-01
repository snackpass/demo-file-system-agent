import { useCallback, useRef } from 'react';

export interface SSEEvent {
  event: string;
  data: unknown;
}

export interface SSEHandlers {
  onEvent: (event: SSEEvent) => void;
  onError?: (error: Error) => void;
  onComplete?: () => void;
}

export function useSSE() {
  const abortControllerRef = useRef<AbortController | null>(null);

  const connect = useCallback(
    async (url: string, body: object, handlers: SSEHandlers) => {
      // Abort any existing connection
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Parse SSE events from buffer
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer

          let currentEvent = '';
          let currentData = '';

          for (const line of lines) {
            if (line.startsWith('event: ')) {
              currentEvent = line.slice(7);
            } else if (line.startsWith('data: ')) {
              currentData = line.slice(6);
            } else if (line === '' && currentEvent && currentData) {
              // Empty line signals end of event
              try {
                const parsedData = JSON.parse(currentData);
                handlers.onEvent({ event: currentEvent, data: parsedData });
              } catch {
                // Skip malformed JSON
              }
              currentEvent = '';
              currentData = '';
            }
          }
        }

        handlers.onComplete?.();
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return; // Connection was intentionally aborted
        }
        handlers.onError?.(error instanceof Error ? error : new Error(String(error)));
      }
    },
    []
  );

  const disconnect = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
  }, []);

  return { connect, disconnect };
}
