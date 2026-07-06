import { startOfDay, differenceInCalendarDays, format } from 'date-fns';
import type { Message } from '../types';

export interface QuickStats {
  total: number;
  perAuthor: Record<string, number>;
  daysSpanned: number;
}

export function computeStats(messages: Message[], authors: string[]): QuickStats {
  const perAuthor = Object.fromEntries(authors.map((a) => [a, 0]));
  let min: Date | null = null;
  let max: Date | null = null;

  for (const msg of messages) {
    if (perAuthor[msg.author] !== undefined) perAuthor[msg.author] += 1;
    if (isNaN(msg.timestamp.getTime())) continue;
    if (!min || msg.timestamp < min) min = msg.timestamp;
    if (!max || msg.timestamp > max) max = msg.timestamp;
  }

  return {
    total: messages.length,
    perAuthor,
    daysSpanned: min && max ? differenceInCalendarDays(max, min) : 0,
  };
}

export interface DayCount {
  date: Date;
  dateKey: string;
  label: string;
  count: number;
}

/** Message counts per calendar day, sorted busiest-first. */
export function computeDailyCounts(messages: Message[]): DayCount[] {
  const counts = new Map<string, { date: Date; count: number }>();

  for (const msg of messages) {
    if (isNaN(msg.timestamp.getTime())) continue;
    const day = startOfDay(msg.timestamp);
    const key = format(day, 'yyyy-MM-dd');
    const existing = counts.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(key, { date: day, count: 1 });
    }
  }

  return Array.from(counts.entries())
    .map(([dateKey, { date, count }]) => ({ dateKey, date, count, label: format(date, 'EEE, MMM d, yyyy') }))
    .sort((a, b) => b.count - a.count);
}
