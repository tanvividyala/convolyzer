import Anthropic from '@anthropic-ai/sdk';

export interface TopicSummary {
  topic: string;
  summary: string;
}

export interface SummaryResult {
  topics: TopicSummary[];
  raw: string;
  usage: { inputTokens: number; outputTokens: number };
}

export async function summarizeDay(opts: {
  apiKey: string;
  model: string;
  participants: string[];
  dateLabel: string;
  conversationText: string;
}): Promise<SummaryResult> {
  const client = new Anthropic({ apiKey: opts.apiKey, dangerouslyAllowBrowser: true });

  const system = `You're analyzing a day's conversation between ${opts.participants.join(
    ' and '
  )} on ${opts.dateLabel}. Break the conversation into the distinct topics or threads that came up and summarize each one separately. Be specific, capture the vibe, and keep it natural, like you're reminding a friend what they talked about. Write plainly: no em dashes, no exclamation points, and no stock AI phrasing like "delve into" or "it's worth noting."

Respond with ONLY a JSON array (no prose before or after, no markdown code fences) in exactly this shape:
[{"topic": "short 2-6 word title", "summary": "2-4 sentence summary of that thread"}]

If the whole day is really just one topic, return a single-element array.`;

  const response = await client.messages.create({
    model: opts.model,
    system,
    messages: [{ role: 'user', content: opts.conversationText }],
    temperature: 0.7,
    max_tokens: 4096,
  });

  const raw = response.content[0]?.type === 'text' ? response.content[0].text : '';

  return {
    topics: parseTopics(raw),
    raw,
    usage: { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens },
  };
}

function parseTopics(raw: string): TopicSummary[] {
  const cleaned = raw
    .trim()
    .replace(/^```(json)?/i, '')
    .replace(/```$/, '')
    .trim();
  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (p): p is TopicSummary => !!p && typeof p.topic === 'string' && typeof p.summary === 'string'
      );
    }
  } catch {
    // Response likely got cut off mid-array (hit max_tokens). Recover whichever
    // topic objects are complete instead of discarding the whole response.
    const objectPattern = /\{\s*"topic"\s*:\s*"(?:[^"\\]|\\.)*"\s*,\s*"summary"\s*:\s*"(?:[^"\\]|\\.)*"\s*\}/g;
    const recovered: TopicSummary[] = [];
    for (const match of cleaned.matchAll(objectPattern)) {
      try {
        const obj = JSON.parse(match[0]);
        if (obj && typeof obj.topic === 'string' && typeof obj.summary === 'string') recovered.push(obj);
      } catch {
        // skip malformed match
      }
    }
    return recovered;
  }
  return [];
}
