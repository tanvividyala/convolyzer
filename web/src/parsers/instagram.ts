import type { Message } from '../types';
import { fixMojibakeDeep } from '../lib/mojibake';

interface InstagramMessage {
  sender_name?: string;
  content?: string;
  timestamp_ms?: number;
}

export function isInstagramFormat(json: unknown): json is { messages: InstagramMessage[] } {
  if (!json || typeof json !== 'object' || !('messages' in json)) return false;
  const messages = (json as { messages?: unknown }).messages;
  return Array.isArray(messages) && messages.length > 0 && typeof messages[0] === 'object' && messages[0] !== null && 'sender_name' in messages[0];
}

export function parseInstagramJson(json: { messages: InstagramMessage[] }, sourceFile: string): Message[] {
  const fixed = fixMojibakeDeep(json);
  const messages: Message[] = [];

  for (const msg of fixed.messages) {
    if (msg.content === undefined) continue;
    messages.push({
      timestamp: new Date(msg.timestamp_ms ?? 0),
      author: msg.sender_name ?? 'Unknown',
      content: msg.content ?? '',
      platform: 'Instagram',
      sourceFile,
    });
  }

  return messages;
}
