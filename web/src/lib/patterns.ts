import Anthropic from '@anthropic-ai/sdk';
import type { Pattern, PatternFlag, Turn } from '../types';

const SYSTEM = `You are analyzing a conversation for communication patterns drawn from Gottman's research on relationship dynamics. For each turn where a pattern is present, identify:

- criticism: attacking the other person's character rather than addressing a specific behavior
- defensiveness: deflecting responsibility or counter-attacking instead of acknowledging a concern
- contempt: mockery, sarcasm, eye-rolling in text form, or statements of superiority
- stonewalling: withdrawing from the conversation, giving minimal responses, or shutting down engagement
- validation: acknowledging the other person's feelings or perspective as legitimate
- repair_attempt: an effort to de-escalate tension or reconnect after conflict

Only flag turns where a pattern is clearly present. Most turns should have no flags at all. Return ONLY a JSON array of objects, each with turn_index, pattern, confidence (0.0 to 1.0), and a short quote (under 15 words) illustrating why. No markdown, no explanation outside the JSON.`;

const VALID: ReadonlySet<Pattern> = new Set<Pattern>([
  'criticism',
  'defensiveness',
  'contempt',
  'stonewalling',
  'validation',
  'repair_attempt',
]);

export const NEGATIVE_PATTERNS: Pattern[] = ['criticism', 'defensiveness', 'contempt', 'stonewalling'];
export const POSITIVE_PATTERNS: Pattern[] = ['validation', 'repair_attempt'];

export const PATTERN_COLORS: Record<Pattern, string> = {
  criticism: '#d85455',
  defensiveness: '#f1a97a',
  contempt: '#a03a5b',
  stonewalling: '#7a7a7a',
  validation: '#43a06b',
  repair_attempt: '#5b8fc9',
};

export const PATTERN_LABELS: Record<Pattern, string> = {
  criticism: 'Criticism',
  defensiveness: 'Defensiveness',
  contempt: 'Contempt',
  stonewalling: 'Stonewalling',
  validation: 'Validation',
  repair_attempt: 'Repair attempt',
};

const CHUNK_TURNS = 80;

export interface PatternsResult {
  flags: PatternFlag[];
  usage: { inputTokens: number; outputTokens: number };
}

interface RawFlag {
  turn_index?: number;
  pattern?: string;
  confidence?: number;
  quote?: string;
}

function parseFlags(raw: string): RawFlag[] {
  const cleaned = raw
    .trim()
    .replace(/^```(json)?/i, '')
    .replace(/```$/, '')
    .trim();
  const attempt = (s: string): RawFlag[] | null => {
    try {
      const parsed = JSON.parse(s);
      return Array.isArray(parsed) ? (parsed as RawFlag[]) : null;
    } catch {
      return null;
    }
  };
  const direct = attempt(cleaned);
  if (direct) return direct;
  const match = cleaned.match(/\[[\s\S]*\]/);
  return match ? attempt(match[0]) ?? [] : [];
}

/**
 * Run Gottman-style pattern detection with Claude Sonnet over the conversation,
 * chunked so the model's attention stays focused. Returns validated flags
 * enriched with the author and timestamp of each flagged turn.
 */
export async function detectPatterns(opts: {
  apiKey: string;
  model: string;
  turns: Turn[];
  onProgress?: (done: number, total: number) => void;
}): Promise<PatternsResult> {
  const client = new Anthropic({ apiKey: opts.apiKey, dangerouslyAllowBrowser: true });
  const byIdx = new Map(opts.turns.map((t) => [t.turnIndex, t]));
  const flags: PatternFlag[] = [];
  let inputTokens = 0;
  let outputTokens = 0;

  const chunks: Turn[][] = [];
  for (let i = 0; i < opts.turns.length; i += CHUNK_TURNS) {
    chunks.push(opts.turns.slice(i, i + CHUNK_TURNS));
  }

  let done = 0;
  for (const chunk of chunks) {
    const payload = chunk.map((t) => `${t.turnIndex} ${t.author}: ${t.content.replace(/\s+/g, ' ').slice(0, 500)}`).join('\n');

    const response = await client.messages.create({
      model: opts.model,
      system: SYSTEM,
      messages: [{ role: 'user', content: `Each line is "turn_index author: text".\n\n${payload}` }],
      temperature: 0,
      max_tokens: 4000,
    });

    inputTokens += response.usage.input_tokens;
    outputTokens += response.usage.output_tokens;

    const raw = response.content[0]?.type === 'text' ? response.content[0].text : '';
    for (const rf of parseFlags(raw)) {
      const pattern = rf.pattern as Pattern;
      if (typeof rf.turn_index !== 'number' || !VALID.has(pattern)) continue;
      const turn = byIdx.get(rf.turn_index);
      if (!turn) continue;
      flags.push({
        turnIndex: rf.turn_index,
        pattern,
        confidence: Math.max(0, Math.min(1, Number(rf.confidence) || 0.5)),
        excerpt: (rf.quote ?? turn.content).slice(0, 160),
        author: turn.author,
        timestamp: turn.timestamp,
      });
    }

    done += 1;
    opts.onProgress?.(done, chunks.length);
  }

  flags.sort((a, b) => a.turnIndex - b.turnIndex);
  return { flags, usage: { inputTokens, outputTokens } };
}

/** Count flags per pattern, split by author, for the asymmetry summary. */
export function countByPatternAndAuthor(flags: PatternFlag[], authors: string[]) {
  const counts: Record<Pattern, Record<string, number>> = {
    criticism: {},
    defensiveness: {},
    contempt: {},
    stonewalling: {},
    validation: {},
    repair_attempt: {},
  };
  for (const p of Object.keys(counts) as Pattern[]) {
    for (const a of authors) counts[p][a] = 0;
  }
  for (const f of flags) {
    if (counts[f.pattern][f.author] === undefined) counts[f.pattern][f.author] = 0;
    counts[f.pattern][f.author] += 1;
  }
  return counts;
}
