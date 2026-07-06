export type Platform = 'iMessage' | 'Instagram' | 'Google Chat' | 'Discord' | 'Generic';

export interface Message {
  timestamp: Date;
  author: string;
  content: string;
  platform: Platform;
  sourceFile: string;
}

export interface ParsedFile {
  fileName: string;
  platform: Platform;
  messages: Message[];
  error?: string;
}

export interface ColumnMapping {
  dateCol: string;
  authorCol: string;
  contentCol: string;
}

export type Frequency = 'Daily' | 'Weekly' | 'Monthly' | 'Yearly';

export interface TrendPoint {
  date: Date;
  label: string;
  total: number;
  byAuthor: Record<string, number>;
}

/** A message with a stable, timestamp-ordered index. */
export interface Turn {
  turnIndex: number;
  timestamp: Date;
  author: string;
  content: string;
}

/** Per-message sentiment/intensity score. */
export interface SentimentTurn {
  turnIndex: number;
  sentiment: number; // -1.0 (negative) .. 1.0 (positive)
  intensity: number; // 0.0 .. 1.0, emotional strength regardless of polarity
}

/** One day's aggregated sentiment, derived from per-message scores. */
export interface DailyAggregate {
  dateKey: string; // YYYY-MM-DD
  date: Date;
  avgSentiment: number;
  count: number;
}

/** One rolling window of the conversation for the mirroring analysis. */
export interface StyleFeatures {
  avgSentenceLength: number;
  ttr: number; // type-token ratio (vocabulary richness)
  emojiRate: number; // emoji per message
  punctRate: number; // punctuation chars per message
}

export interface MirrorWindow {
  windowIndex: number;
  startTurn: number;
  endTurn: number;
  label: string;
  a: StyleFeatures | null;
  b: StyleFeatures | null;
  similarity: number | null; // cosine of the two speakers' embeddings, null if under-populated
}

export type Pattern =
  | 'criticism'
  | 'defensiveness'
  | 'contempt'
  | 'stonewalling'
  | 'validation'
  | 'repair_attempt';

export interface PatternFlag {
  turnIndex: number;
  pattern: Pattern;
  confidence: number;
  excerpt: string;
  author: string;
  timestamp: Date;
}

/** An overlapping passage indexed for semantic search. */
export interface SearchChunk {
  chunkId: string;
  startTurn: number;
  endTurn: number;
  text: string;
  preview: string;
  startTime: Date;
  embedding: Float32Array;
}

export interface SearchHit {
  chunk: SearchChunk;
  score: number;
}
