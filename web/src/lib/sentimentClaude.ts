import Anthropic from '@anthropic-ai/sdk';
import type { SentimentTurn, Turn } from '../types';

const SYSTEM = `You are analyzing a conversation for emotional tone. For each message provided, return a compact array in this exact order: [turn_index, sentiment, intensity]. sentiment ranges from -1.0 negative to 1.0 positive. intensity ranges from 0.0 to 1.0 for emotional strength regardless of polarity. Return ONLY a JSON array of arrays. No markdown, no explanation, no object keys.`;

const CHUNK_SIZE = 250;
const OVERLAP = 5;

export interface ClaudeSentimentResult {
  scores: SentimentTurn[];
  usage: { inputTokens: number; outputTokens: number };
}

/** Strip code fences and parse a JSON array-of-arrays; tolerates trailing junk. */
function parseArrayOfArrays(raw: string): number[][] {
  const cleaned = raw
    .trim()
    .replace(/^```(json)?/i, '')
    .replace(/```$/, '')
    .trim();
  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return parsed.filter((r) => Array.isArray(r)) as number[][];
  } catch {
    // Salvage the first [...] block if the model added stray prose.
    const match = cleaned.match(/\[[\s\S]*\]/);
    if (match) {
      try {
        const parsed = JSON.parse(match[0]);
        if (Array.isArray(parsed)) return parsed.filter((r) => Array.isArray(r)) as number[][];
      } catch {
        /* give up on this chunk */
      }
    }
  }
  return [];
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * Score every turn with Claude Haiku, chunked with a small overlap so tone
 * context carries across boundaries. Overlapping turns keep their first score.
 */
export async function scoreWithClaude(opts: {
  apiKey: string;
  model: string;
  turns: Turn[];
  onProgress?: (done: number, total: number) => void;
}): Promise<ClaudeSentimentResult> {
  const client = new Anthropic({ apiKey: opts.apiKey, dangerouslyAllowBrowser: true });
  const scores = new Map<number, SentimentTurn>();
  let inputTokens = 0;
  let outputTokens = 0;

  const chunks: Turn[][] = [];
  for (let i = 0; i < opts.turns.length; i += CHUNK_SIZE - OVERLAP) {
    chunks.push(opts.turns.slice(i, i + CHUNK_SIZE));
    if (i + CHUNK_SIZE >= opts.turns.length) break;
  }

  let done = 0;
  for (const chunk of chunks) {
    const payload = chunk
      .map((t) => `${t.turnIndex}\t${t.content.replace(/\s+/g, ' ').slice(0, 400)}`)
      .join('\n');

    const response = await client.messages.create({
      model: opts.model,
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content: `Score these messages. Each line is "turn_index<TAB>text".\n\n${payload}`,
        },
      ],
      temperature: 0,
      max_tokens: Math.min(8000, chunk.length * 20 + 200),
    });

    inputTokens += response.usage.input_tokens;
    outputTokens += response.usage.output_tokens;

    const raw = response.content[0]?.type === 'text' ? response.content[0].text : '';
    for (const row of parseArrayOfArrays(raw)) {
      const [idx, sentiment, intensity] = row;
      if (typeof idx !== 'number' || scores.has(idx)) continue;
      scores.set(idx, {
        turnIndex: idx,
        sentiment: clamp(Number(sentiment) || 0, -1, 1),
        intensity: clamp(Number(intensity) || 0, 0, 1),
      });
    }

    done += 1;
    opts.onProgress?.(done, chunks.length);
  }

  // Any turn the model skipped defaults to neutral so downstream aggregates stay aligned.
  const filled = opts.turns.map(
    (t) => scores.get(t.turnIndex) ?? { turnIndex: t.turnIndex, sentiment: 0, intensity: 0 }
  );

  return { scores: filled, usage: { inputTokens, outputTokens } };
}
