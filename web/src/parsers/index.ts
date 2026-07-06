import type { ColumnMapping, Message, ParsedFile } from '../types';
import { parseIMessageTxt } from './imessage';
import { isInstagramFormat, parseInstagramJson } from './instagram';
import { isGoogleChatFormat, parseGoogleChatJson } from './googleChat';
import { isDiscordCsv, parseDiscordCsv } from './discordCsv';
import { guessColumnMapping, parseGenericCsvRows, parseGenericJsonArray } from './genericCsvJson';

export type ParseResult =
  | { status: 'ok'; parsed: ParsedFile }
  | { status: 'needs-mapping'; fileName: string; columns: string[]; rows: Record<string, unknown>[]; suggested: ColumnMapping }
  | { status: 'error'; fileName: string; error: string };

function isConfidentMapping(columns: string[], mapping: ColumnMapping): boolean {
  const known = ['Date', 'timestamp', 'Timestamp', 'date', 'created_date', 'Author', 'sender_name', 'sender', 'author', 'username', 'Username', 'Content', 'content', 'message', 'Message', 'text', 'Text'];
  return columns.length >= 2 && known.includes(mapping.dateCol) && known.includes(mapping.authorCol) && known.includes(mapping.contentCol);
}

export async function parseFile(file: File): Promise<ParseResult> {
  const fileName = file.name;
  const ext = fileName.split('.').pop()?.toLowerCase();

  try {
    if (ext === 'txt') {
      const text = await file.text();
      const messages: Message[] = parseIMessageTxt(text, fileName);
      if (messages.length === 0) {
        return { status: 'error', fileName, error: "Couldn't find any iMessage-style messages in this file." };
      }
      return { status: 'ok', parsed: { fileName, platform: 'iMessage', messages } };
    }

    if (ext === 'json') {
      const text = await file.text();
      const json = JSON.parse(text);

      if (isInstagramFormat(json)) {
        return { status: 'ok', parsed: { fileName, platform: 'Instagram', messages: parseInstagramJson(json, fileName) } };
      }
      if (isGoogleChatFormat(json)) {
        return { status: 'ok', parsed: { fileName, platform: 'Google Chat', messages: parseGoogleChatJson(json, fileName) } };
      }

      const arr: Record<string, unknown>[] = Array.isArray(json) ? json : [json];
      if (arr.length === 0) {
        return { status: 'error', fileName, error: 'This JSON file has no rows to parse.' };
      }
      const columns = Object.keys(arr[0]);
      const suggested = guessColumnMapping(columns);
      if (isConfidentMapping(columns, suggested)) {
        return { status: 'ok', parsed: { fileName, platform: 'Generic', messages: parseGenericJsonArray(arr, suggested, fileName) } };
      }
      return { status: 'needs-mapping', fileName, columns, rows: arr, suggested };
    }

    // csv (default)
    const text = await file.text();
    const { rows, columns } = parseGenericCsvRows(text);
    if (columns.length === 0) {
      return { status: 'error', fileName, error: "Couldn't read any columns from this CSV." };
    }
    if (isDiscordCsv(columns)) {
      return { status: 'ok', parsed: { fileName, platform: 'Discord', messages: parseDiscordCsv(text, fileName) } };
    }
    const suggested = guessColumnMapping(columns);
    if (isConfidentMapping(columns, suggested)) {
      return { status: 'ok', parsed: { fileName, platform: 'Generic', messages: parseGenericJsonArray(rows, suggested, fileName) } };
    }
    return { status: 'needs-mapping', fileName, columns, rows, suggested };
  } catch (e) {
    return { status: 'error', fileName, error: e instanceof Error ? e.message : 'Failed to parse file.' };
  }
}
