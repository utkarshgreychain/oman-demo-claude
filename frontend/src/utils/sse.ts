import type { SSEEvent } from '../types/chat';

export function parseSSEEvents(chunk: string): SSEEvent[] {
  const events: SSEEvent[] = [];
  const lines = chunk.split('\n');
  let currentEvent: string | null = null;
  let currentData = '';

  for (const line of lines) {
    if (line.startsWith('event: ')) {
      currentEvent = line.slice(7).trim();
    } else if (line.startsWith('data: ')) {
      currentData = line.slice(6);
    } else if (line === '' && currentData) {
      try {
        const parsed = JSON.parse(currentData);
        events.push({
          type: parsed.type || currentEvent || 'token',
          data: parsed,
        });
      } catch {
        // Skip malformed events
      }
      currentEvent = null;
      currentData = '';
    }
  }

  return events;
}
