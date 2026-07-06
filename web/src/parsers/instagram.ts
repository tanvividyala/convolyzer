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

// Instagram fills `content` with auto-generated activity text (not anything a
// person typed) for attachments, reactions, calls, and group events — e.g.
// "Alex sent an attachment.", "Reacted 😂 to your message". Left in, these
// leak words like "attachment" into word/sentiment/summary stats.
const SYSTEM_MESSAGE_PATTERN =
  /^(?:.+ )?(sent an attachment|sent a photo|sent a video|sent a voice message|sent a link|sent a gif|sent a sticker|liked a message|reacted .+ to (your message|.+'s message)|shared a story|sent a story reply|unsent a message|started a video chat|started an audio chat|missed a video chat|missed an audio chat|joined the video chat|joined the audio chat|left the group|is now an admin|set (the|your) nickname|changed the group photo|named the group|created the group)\.?$/i;

function isSystemMessage(content: string): boolean {
  return SYSTEM_MESSAGE_PATTERN.test(content.trim());
}

export function parseInstagramJson(json: { messages: InstagramMessage[] }, sourceFile: string): Message[] {
  const fixed = fixMojibakeDeep(json);
  const messages: Message[] = [];

  for (const msg of fixed.messages) {
    if (msg.content === undefined) continue;
    if (isSystemMessage(msg.content)) continue;
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
