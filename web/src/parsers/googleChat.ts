import type { Message } from '../types';

interface GoogleChatMessage {
  creator?: { name?: string };
  created_date?: string;
  text?: string;
}

export function isGoogleChatFormat(json: unknown): json is { messages: GoogleChatMessage[] } {
  if (!json || typeof json !== 'object' || !('messages' in json)) return false;
  const messages = (json as { messages?: unknown }).messages;
  return Array.isArray(messages) && messages.length > 0 && typeof messages[0] === 'object' && messages[0] !== null && 'creator' in messages[0];
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// "Saturday, June 9, 2018 at 11:42:22 PM UTC" -> Date
function parseCreatedDate(dateStr: string): Date | null {
  const cleaned = dateStr.split(', ').slice(1).join(', ').replace(' at ', ' ').replace(' UTC', '');
  const match = cleaned.match(/^([A-Za-z]+) (\d{1,2}), (\d{4}) (\d{1,2}):(\d{2}):(\d{2}) ([AP]M)$/);
  if (!match) return null;
  const [, monthName, day, year, hh, mm, ss, ampm] = match;
  const monthIdx = MONTHS.indexOf(monthName);
  if (monthIdx === -1) return null;
  let hour = parseInt(hh, 10) % 12;
  if (ampm === 'PM') hour += 12;
  const d = new Date(Date.UTC(parseInt(year, 10), monthIdx, parseInt(day, 10), hour, parseInt(mm, 10), parseInt(ss, 10)));
  return isNaN(d.getTime()) ? null : d;
}

export function parseGoogleChatJson(json: { messages: GoogleChatMessage[] }, sourceFile: string): Message[] {
  const messages: Message[] = [];

  for (const msg of json.messages) {
    if (!msg.text) continue;
    const creatorName = msg.creator?.name ?? 'Unknown';
    const timestamp = msg.created_date ? parseCreatedDate(msg.created_date) : null;

    messages.push({
      timestamp: timestamp ?? new Date(NaN),
      author: creatorName,
      content: msg.text,
      platform: 'Google Chat',
      sourceFile,
    });
  }

  return messages;
}
