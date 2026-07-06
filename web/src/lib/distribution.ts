import { startOfDay, startOfWeek, startOfMonth, format } from 'date-fns';
import type { Turn } from '../types';

type ProportionFrequency = 'Daily' | 'Weekly' | 'Monthly';

const FREQ_START: Record<ProportionFrequency, (d: Date) => Date> = {
  Daily: startOfDay,
  Weekly: startOfWeek,
  Monthly: startOfMonth,
};

const FREQ_LABEL: Record<ProportionFrequency, string> = {
  Daily: 'MMM d, yyyy',
  Weekly: 'MMM d, yyyy',
  Monthly: 'MMM yyyy',
};

export interface ProportionPoint {
  date: Date;
  label: string;
  byAuthor: Record<string, number>; // percentage of that bucket's messages, 0-100
}

/** Each author's share of messages per time bucket, as a percentage. */
export function buildProportionTrend(turns: Turn[], authors: string[], frequency: ProportionFrequency): ProportionPoint[] {
  const startFn = FREQ_START[frequency];
  const buckets = new Map<number, { date: Date; total: number; byAuthor: Record<string, number> }>();

  for (const t of turns) {
    const bucketDate = startFn(t.timestamp);
    const key = bucketDate.getTime();
    let b = buckets.get(key);
    if (!b) {
      b = { date: bucketDate, total: 0, byAuthor: Object.fromEntries(authors.map((a) => [a, 0])) };
      buckets.set(key, b);
    }
    b.total += 1;
    if (b.byAuthor[t.author] !== undefined) b.byAuthor[t.author] += 1;
  }

  return Array.from(buckets.values())
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((b) => ({
      date: b.date,
      label: format(b.date, FREQ_LABEL[frequency]),
      byAuthor: Object.fromEntries(authors.map((a) => [a, b.total > 0 ? (b.byAuthor[a] / b.total) * 100 : 0])),
    }));
}
