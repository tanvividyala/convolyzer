import { startOfDay, startOfWeek, startOfMonth, startOfYear, format } from 'date-fns';
import type { Frequency, Message, TrendPoint } from '../types';

function bucketStart(date: Date, frequency: Frequency): Date {
  switch (frequency) {
    case 'Daily':
      return startOfDay(date);
    case 'Weekly':
      return startOfWeek(date);
    case 'Monthly':
      return startOfMonth(date);
    case 'Yearly':
      return startOfYear(date);
  }
}

function bucketLabel(date: Date, frequency: Frequency): string {
  switch (frequency) {
    case 'Daily':
      return format(date, 'MMM d, yyyy');
    case 'Weekly':
      return format(date, 'MMM d, yyyy');
    case 'Monthly':
      return format(date, 'MMM yyyy');
    case 'Yearly':
      return format(date, 'yyyy');
  }
}

export function buildTrend(messages: Message[], authors: string[], frequency: Frequency): TrendPoint[] {
  const buckets = new Map<number, TrendPoint>();

  for (const msg of messages) {
    if (isNaN(msg.timestamp.getTime())) continue;
    const bucketDate = bucketStart(msg.timestamp, frequency);
    const key = bucketDate.getTime();

    let point = buckets.get(key);
    if (!point) {
      point = { date: bucketDate, label: bucketLabel(bucketDate, frequency), total: 0, byAuthor: Object.fromEntries(authors.map((a) => [a, 0])) };
      buckets.set(key, point);
    }
    point.total += 1;
    if (point.byAuthor[msg.author] !== undefined) {
      point.byAuthor[msg.author] += 1;
    }
  }

  return Array.from(buckets.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
}
