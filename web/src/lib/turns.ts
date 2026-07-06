import type { Message, Turn } from '../types';

/**
 * Normalize messages into a timestamp-ordered array with a stable turnIndex.
 * Messages with invalid timestamps are dropped, since every downstream feature
 * (sentiment-over-time, windows, chunks) needs a usable ordering.
 */
export function toTurns(messages: Message[]): Turn[] {
  return messages
    .filter((m) => !isNaN(m.timestamp.getTime()))
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
    .map((m, i) => ({
      turnIndex: i,
      timestamp: m.timestamp,
      author: m.author,
      content: m.content,
    }));
}

/** Turns falling within [start, end] inclusive by calendar date. */
export function sliceByDate(turns: Turn[], start: Date, end: Date): Turn[] {
  const lo = start.getTime();
  const hi = end.getTime();
  return turns.filter((t) => t.timestamp.getTime() >= lo && t.timestamp.getTime() <= hi);
}

/** The two most active authors, for features scoped to a two-person exchange. */
export function topTwoAuthors(turns: Turn[]): string[] {
  const counts = new Map<string, number>();
  for (const t of turns) counts.set(t.author, (counts.get(t.author) ?? 0) + 1);
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([author]) => author);
}
