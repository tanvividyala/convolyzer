import Papa from 'papaparse';
import type { ColumnMapping, Message } from '../types';

export function parseGenericCsvRows(text: string): { rows: Record<string, string>[]; columns: string[] } {
  const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
  return { rows: parsed.data, columns: parsed.meta.fields ?? [] };
}

export function guessColumnMapping(columns: string[]): ColumnMapping {
  const dateCandidates = ['Date', 'timestamp', 'Timestamp', 'date', 'created_date'];
  const authorCandidates = ['Author', 'sender_name', 'sender', 'author', 'username', 'Username'];
  const contentCandidates = ['Content', 'content', 'message', 'Message', 'text', 'Text'];

  const find = (candidates: string[], fallbackIdx: number) =>
    candidates.find((c) => columns.includes(c)) ?? columns[fallbackIdx] ?? columns[0];

  return {
    dateCol: find(dateCandidates, 0),
    authorCol: find(authorCandidates, columns.length > 1 ? 1 : 0),
    contentCol: find(contentCandidates, columns.length > 2 ? 2 : 0),
  };
}

export function parseGenericJsonArray(json: Record<string, unknown>[], mapping: ColumnMapping, sourceFile: string): Message[] {
  const messages: Message[] = [];
  for (const row of json) {
    const content = row[mapping.contentCol];
    if (content === undefined || content === null) continue;
    const dateVal = row[mapping.dateCol];
    messages.push({
      timestamp: new Date(dateVal as string | number),
      author: (row[mapping.authorCol] as string) ?? 'Unknown',
      content: String(content),
      platform: 'Generic',
      sourceFile,
    });
  }
  return messages;
}
