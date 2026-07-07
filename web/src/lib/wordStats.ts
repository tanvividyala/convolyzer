import { startOfDay, startOfWeek, startOfMonth, format } from 'date-fns';
import type { Turn } from '../types';

const EMOJI = /\p{Extended_Pictographic}/gu;

// A compact general-English stopword list (articles, pronouns, auxiliaries,
// prepositions), enough to keep "top words" meaningful without pulling in a
// full NLP corpus for a client-side chart.
const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', "aren't", 'as', 'at',
  'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
  'can', "can't", 'cant', 'could', "couldn't",
  'did', "didn't", 'do', 'does', "doesn't", 'doing', "don't", 'down', 'during',
  'each',
  'few', 'for', 'from', 'further',
  'had', "hadn't", 'has', "hasn't", 'have', "haven't", 'having', 'he', "he'd", "he'll", "he's", 'her', 'here', "here's", 'hers', 'herself', 'him', 'himself', 'his', 'how', "how's",
  'i', "i'd", "i'll", "i'm", "i've", 'if', 'in', 'into', 'is', "isn't", 'it', "it's", 'its', 'itself',
  "let's",
  'me', 'more', 'most', "mustn't", 'my', 'myself',
  'no', 'nor', 'not',
  'of', 'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own',
  'same', "shan't", 'she', "she'd", "she'll", "she's", 'should', "shouldn't", 'so', 'some', 'such',
  'than', 'that', "that's", 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', "there's", 'these', 'they', "they'd", "they'll", "they're", "they've", 'this', 'those', 'through', 'to', 'too',
  'under', 'until', 'up',
  'very',
  'was', "wasn't", 'we', "we'd", "we'll", "we're", "we've", 'were', "weren't", 'what', "what's", 'when', "when's", 'where', "where's", 'which', 'while', 'who', "who's", 'whom', 'why', "why's", 'with', "won't", 'would', "wouldn't",
  'you', "you'd", "you'll", "you're", "you've", 'your', 'yours', 'yourself', 'yourselves',
  'im', 'ur', 'u', 'yeah', 'ya', 'oh', 'okay', 'ok', 'just', 'like', 'get', 'got', 'go', 'going',
  // Export-tool boilerplate (attachment placeholders, link fragments) rather than
  // words anyone actually typed.
  'attachment', 'attachments', 'omitted', 'voicemail', 'http', 'https', 'www',
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}'\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

// Digits-only tokens (phone numbers, timestamps, IDs) and stray fragments with
// no letters at all aren't "words" for a top-words chart.
function isRealWord(w: string): boolean {
  return /\p{L}/u.test(w);
}

export interface WordCount {
  word: string;
  count: number;
}

interface WordFilterOpts {
  author?: string; // 'Everyone' or omitted = no author filter
  limit: number;
  extraStopWords?: Set<string>;
}

export function computeTopWords(turns: Turn[], opts: WordFilterOpts): WordCount[] {
  const counts = new Map<string, number>();
  for (const t of turns) {
    if (opts.author && opts.author !== 'Everyone' && t.author !== opts.author) continue;
    for (const w of tokenize(t.content)) {
      if (w.length <= 1) continue;
      if (!isRealWord(w)) continue;
      if (STOP_WORDS.has(w)) continue;
      if (opts.extraStopWords?.has(w)) continue;
      counts.set(w, (counts.get(w) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, opts.limit)
    .map(([word, count]) => ({ word, count }));
}

export interface EmojiCount {
  emoji: string;
  count: number;
}

export function computeTopEmojis(turns: Turn[], opts: { author?: string; limit: number }): EmojiCount[] {
  const counts = new Map<string, number>();
  for (const t of turns) {
    if (opts.author && opts.author !== 'Everyone' && t.author !== opts.author) continue;
    const matches = t.content.match(EMOJI);
    if (!matches) continue;
    for (const e of matches) counts.set(e, (counts.get(e) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, opts.limit)
    .map(([emoji, count]) => ({ emoji, count }));
}

type WordFrequency = 'Daily' | 'Weekly' | 'Monthly';

const FREQ_START: Record<WordFrequency, (d: Date) => Date> = {
  Daily: startOfDay,
  Weekly: startOfWeek,
  Monthly: startOfMonth,
};

const FREQ_LABEL: Record<WordFrequency, string> = {
  Daily: 'MMM d, yyyy',
  Weekly: 'MMM d, yyyy',
  Monthly: 'MMM yyyy',
};

export interface WordTrendPoint {
  label: string;
  byAuthor: Record<string, number>; // percentage of that author's bucket messages containing the word
  authorTotals: Record<string, number>; // raw hit counts, for the summary row
}

/** Percentage of each bucket's messages, per author, containing `needle`. */
export function wordUsageTrend(turns: Turn[], authors: string[], needle: string, frequency: WordFrequency, caseSensitive: boolean): WordTrendPoint[] {
  const startFn = FREQ_START[frequency];
  const test = caseSensitive ? (s: string) => s.includes(needle) : (s: string) => s.toLowerCase().includes(needle.toLowerCase());

  const buckets = new Map<
    number,
    { date: Date; authorTotal: Record<string, number>; authorHits: Record<string, number> }
  >();

  for (const t of turns) {
    const bucketDate = startFn(t.timestamp);
    const key = bucketDate.getTime();
    let b = buckets.get(key);
    if (!b) {
      b = { date: bucketDate, authorTotal: Object.fromEntries(authors.map((a) => [a, 0])), authorHits: Object.fromEntries(authors.map((a) => [a, 0])) };
      buckets.set(key, b);
    }
    if (b.authorTotal[t.author] !== undefined) {
      b.authorTotal[t.author] += 1;
      if (needle && test(t.content)) b.authorHits[t.author] += 1;
    }
  }

  return Array.from(buckets.values())
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((b) => ({
      label: format(b.date, FREQ_LABEL[frequency]),
      byAuthor: Object.fromEntries(authors.map((a) => [a, b.authorTotal[a] > 0 ? (b.authorHits[a] / b.authorTotal[a]) * 100 : 0])),
      authorTotals: b.authorHits,
    }));
}
