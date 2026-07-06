import { startOfDay, startOfWeek, startOfMonth, format } from 'date-fns';
import type { DailyAggregate, Frequency, SentimentTurn, Turn } from '../types';

/** Per-calendar-day average sentiment, chronological. Derived once, reused by both views. */
export function dailyAggregates(turns: Turn[], scores: SentimentTurn[]): DailyAggregate[] {
  const byIdx = new Map(scores.map((s) => [s.turnIndex, s]));
  const buckets = new Map<string, { date: Date; sum: number; count: number }>();

  for (const t of turns) {
    const s = byIdx.get(t.turnIndex);
    if (!s) continue;
    const day = startOfDay(t.timestamp);
    const key = format(day, 'yyyy-MM-dd');
    const b = buckets.get(key);
    if (b) {
      b.sum += s.sentiment;
      b.count += 1;
    } else {
      buckets.set(key, { date: day, sum: s.sentiment, count: 1 });
    }
  }

  return Array.from(buckets.entries())
    .map(([dateKey, { date, sum, count }]) => ({ dateKey, date, avgSentiment: sum / count, count }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

export interface SentimentPoint {
  date: Date;
  label: string;
  overall: number;
  byAuthor: Record<string, number | null>;
}

const FREQ_START: Record<Exclude<Frequency, 'Yearly'>, (d: Date) => Date> = {
  Daily: startOfDay,
  Weekly: startOfWeek,
  Monthly: startOfMonth,
};

const FREQ_LABEL: Record<Exclude<Frequency, 'Yearly'>, string> = {
  Daily: 'MMM d, yyyy',
  Weekly: 'MMM d, yyyy',
  Monthly: 'MMM yyyy',
};

/** Average sentiment over time, overall and per author, at the given frequency. */
export function sentimentTrend(
  turns: Turn[],
  scores: SentimentTurn[],
  authors: string[],
  frequency: Exclude<Frequency, 'Yearly'>
): SentimentPoint[] {
  const byIdx = new Map(scores.map((s) => [s.turnIndex, s]));
  const startFn = FREQ_START[frequency];

  const buckets = new Map<
    number,
    { date: Date; sum: number; count: number; authorSum: Record<string, number>; authorCount: Record<string, number> }
  >();

  for (const t of turns) {
    const s = byIdx.get(t.turnIndex);
    if (!s) continue;
    const bucketDate = startFn(t.timestamp);
    const key = bucketDate.getTime();
    let b = buckets.get(key);
    if (!b) {
      b = {
        date: bucketDate,
        sum: 0,
        count: 0,
        authorSum: Object.fromEntries(authors.map((a) => [a, 0])),
        authorCount: Object.fromEntries(authors.map((a) => [a, 0])),
      };
      buckets.set(key, b);
    }
    b.sum += s.sentiment;
    b.count += 1;
    if (b.authorSum[t.author] !== undefined) {
      b.authorSum[t.author] += s.sentiment;
      b.authorCount[t.author] += 1;
    }
  }

  return Array.from(buckets.values())
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((b) => ({
      date: b.date,
      label: format(b.date, FREQ_LABEL[frequency]),
      overall: b.sum / b.count,
      byAuthor: Object.fromEntries(
        authors.map((a) => [a, b.authorCount[a] > 0 ? b.authorSum[a] / b.authorCount[a] : null])
      ),
    }));
}

export type MoodBucket = 'very-pos' | 'pos' | 'neutral' | 'neg' | 'very-neg' | 'no-data';

/** Discrete color buckets read more clearly than a gradient at small cell sizes. */
export function sentimentToBucket(value: number | null | undefined): MoodBucket {
  if (value == null || Number.isNaN(value)) return 'no-data';
  if (value > 0.5) return 'very-pos';
  if (value >= 0.15) return 'pos';
  if (value > -0.15) return 'neutral';
  if (value > -0.5) return 'neg';
  return 'very-neg';
}

export const MOOD_COLORS: Record<MoodBucket, string> = {
  'very-pos': '#43a06b',
  pos: '#91ad94',
  neutral: '#f3ecd7',
  neg: '#f1a97a',
  'very-neg': '#d85455',
  'no-data': '#efe9d8',
};

export const MOOD_LABELS: Record<MoodBucket, string> = {
  'very-pos': 'Very positive',
  pos: 'Positive',
  neutral: 'Neutral',
  neg: 'Negative',
  'very-neg': 'Very negative',
  'no-data': 'No data',
};
