import { format } from 'date-fns';
import type { MirrorWindow, StyleFeatures, Turn } from '../types';
import { embed, cosine, type LoadProgress } from './embeddings';

const EMOJI = /\p{Extended_Pictographic}/gu;
const WINDOW_TURNS = 20;
const MIN_MESSAGES_PER_SPEAKER = 3;

function styleFeatures(texts: string[]): StyleFeatures {
  let sentenceLenSum = 0;
  let sentenceCount = 0;
  const vocab = new Set<string>();
  let tokenCount = 0;
  let emojiCount = 0;
  let punctCount = 0;

  for (const text of texts) {
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim());
    for (const s of sentences) {
      const words = s.trim().split(/\s+/).filter(Boolean);
      if (words.length) {
        sentenceLenSum += words.length;
        sentenceCount += 1;
      }
    }
    for (const w of text.toLowerCase().split(/\s+/)) {
      const clean = w.replace(/[^\p{L}\p{N}']/gu, '');
      if (clean) {
        vocab.add(clean);
        tokenCount += 1;
      }
    }
    emojiCount += (text.match(EMOJI) || []).length;
    punctCount += (text.match(/[!?.,;:~]/g) || []).length;
  }

  const n = texts.length || 1;
  return {
    avgSentenceLength: sentenceCount ? sentenceLenSum / sentenceCount : 0,
    ttr: tokenCount ? vocab.size / tokenCount : 0,
    emojiRate: emojiCount / n,
    punctRate: punctCount / n,
  };
}

export interface MirroringResult {
  windows: MirrorWindow[];
  speakers: [string, string];
}

/**
 * Split the two-speaker conversation into rolling windows and, per window,
 * compute each speaker's style features and the cosine similarity of their
 * aggregated embeddings. A rising similarity trend = increasing accommodation.
 */
export async function computeMirroring(
  turns: Turn[],
  speakers: [string, string],
  onProgress?: (p: LoadProgress) => void
): Promise<MirroringResult> {
  const [aName, bName] = speakers;

  // Build window slices first so we can batch every embedding in one pass.
  interface Slice {
    windowIndex: number;
    startTurn: number;
    endTurn: number;
    label: string;
    aTexts: string[];
    bTexts: string[];
  }
  const slices: Slice[] = [];

  for (let start = 0; start < turns.length; start += WINDOW_TURNS) {
    const windowTurns = turns.slice(start, start + WINDOW_TURNS);
    if (windowTurns.length === 0) continue;
    const aTexts = windowTurns.filter((t) => t.author === aName).map((t) => t.content);
    const bTexts = windowTurns.filter((t) => t.author === bName).map((t) => t.content);
    slices.push({
      windowIndex: slices.length,
      startTurn: windowTurns[0].turnIndex,
      endTurn: windowTurns[windowTurns.length - 1].turnIndex,
      label: format(windowTurns[0].timestamp, 'MMM d, yyyy'),
      aTexts,
      bTexts,
    });
  }

  // Only windows where both speakers cleared the minimum get an embedding.
  const embedTexts: string[] = [];
  const embedRefs: { sliceIdx: number; side: 'a' | 'b' }[] = [];
  slices.forEach((s, i) => {
    const scored = s.aTexts.length >= MIN_MESSAGES_PER_SPEAKER && s.bTexts.length >= MIN_MESSAGES_PER_SPEAKER;
    if (scored) {
      embedTexts.push(s.aTexts.join(' '));
      embedRefs.push({ sliceIdx: i, side: 'a' });
      embedTexts.push(s.bTexts.join(' '));
      embedRefs.push({ sliceIdx: i, side: 'b' });
    }
  });

  const vectors = embedTexts.length ? await embed(embedTexts, onProgress) : [];
  const aVec = new Map<number, Float32Array>();
  const bVec = new Map<number, Float32Array>();
  embedRefs.forEach((ref, i) => {
    (ref.side === 'a' ? aVec : bVec).set(ref.sliceIdx, vectors[i]);
  });

  const windows: MirrorWindow[] = slices.map((s, i) => {
    const va = aVec.get(i);
    const vb = bVec.get(i);
    return {
      windowIndex: s.windowIndex,
      startTurn: s.startTurn,
      endTurn: s.endTurn,
      label: s.label,
      a: s.aTexts.length ? styleFeatures(s.aTexts) : null,
      b: s.bTexts.length ? styleFeatures(s.bTexts) : null,
      similarity: va && vb ? cosine(va, vb) : null,
    };
  });

  return { windows, speakers };
}

/** Absolute gap between the two speakers' feature values, per window (0 = converged). */
export function featureGap(windows: MirrorWindow[], key: keyof StyleFeatures): (number | null)[] {
  // Normalize each feature across windows so gaps are comparable on a 0..1 scale.
  const all: number[] = [];
  for (const w of windows) {
    if (w.a) all.push(w.a[key]);
    if (w.b) all.push(w.b[key]);
  }
  const max = Math.max(1e-6, ...all);
  return windows.map((w) => (w.a && w.b ? Math.abs(w.a[key] - w.b[key]) / max : null));
}
