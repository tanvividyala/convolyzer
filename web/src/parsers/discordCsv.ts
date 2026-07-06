import Papa from 'papaparse';
import type { Message } from '../types';

export function isDiscordCsv(headers: string[]): boolean {
  return headers.includes('Date') && headers.includes('Author') && headers.includes('Content');
}

export function parseDiscordCsv(text: string, sourceFile: string): Message[] {
  const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
  const messages: Message[] = [];

  for (const row of parsed.data) {
    if (!row.Content) continue;
    const timestamp = new Date(row.Date);
    messages.push({
      timestamp,
      author: row.Author ?? 'Unknown',
      content: row.Content,
      platform: 'Discord',
      sourceFile,
    });
  }

  return messages;
}
