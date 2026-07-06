import { format } from 'date-fns';
import type { SearchChunk, SearchHit, Turn } from '../types';
import { embed, cosine, type LoadProgress } from './embeddings';

const CHUNK_TURNS = 8;
const OVERLAP = 2;
const MIN_CHARS = 40;

/** Build overlapping passages from a slice of turns. Very short chunks are dropped. */
export function buildChunks(turns: Turn[]): Omit<SearchChunk, 'embedding'>[] {
  const chunks: Omit<SearchChunk, 'embedding'>[] = [];
  for (let i = 0; i < turns.length; i += CHUNK_TURNS - OVERLAP) {
    const slice = turns.slice(i, i + CHUNK_TURNS);
    if (slice.length === 0) break;
    const text = slice.map((t) => `${t.author}: ${t.content}`).join('\n');
    if (text.trim().length < MIN_CHARS) {
      if (i + CHUNK_TURNS >= turns.length) break;
      continue;
    }
    chunks.push({
      chunkId: `${slice[0].turnIndex}-${slice[slice.length - 1].turnIndex}`,
      startTurn: slice[0].turnIndex,
      endTurn: slice[slice.length - 1].turnIndex,
      text,
      preview: text.replace(/\s+/g, ' ').slice(0, 220),
      startTime: slice[0].timestamp,
    });
    if (i + CHUNK_TURNS >= turns.length) break;
  }
  return chunks;
}

/** An in-memory embedded index for one date-range slice of the conversation. */
export interface SearchIndex {
  rangeKey: string;
  chunks: SearchChunk[];
}

export async function buildIndex(turns: Turn[], rangeKey: string, onProgress?: (p: LoadProgress) => void): Promise<SearchIndex> {
  const base = buildChunks(turns);
  const vectors = base.length ? await embed(base.map((c) => c.text), onProgress) : [];
  const chunks: SearchChunk[] = base.map((c, i) => ({ ...c, embedding: vectors[i] }));
  return { rangeKey, chunks };
}

/** Embed the query and return the top-k most similar chunks. */
export async function search(index: SearchIndex, query: string, topK = 8): Promise<SearchHit[]> {
  if (!query.trim() || index.chunks.length === 0) return [];
  const [queryVec] = await embed([query]);
  return index.chunks
    .map((chunk) => ({ chunk, score: cosine(queryVec, chunk.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

export function rangeKey(start: Date, end: Date): string {
  return `${format(start, 'yyyy-MM-dd')}_${format(end, 'yyyy-MM-dd')}`;
}
