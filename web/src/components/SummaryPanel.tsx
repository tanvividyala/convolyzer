import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import type { Message } from '../types';
import { computeDailyCounts } from '../lib/stats';
import { summarizeDay, type SummaryResult } from '../lib/anthropic';

const MODELS = [
  { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 (fastest, cheapest)' },
  { value: 'claude-sonnet-5', label: 'Claude Sonnet 5' },
  { value: 'claude-opus-4-8', label: 'Claude Opus 4.8 (most capable)' },
];

const CARD_ACCENTS = ['var(--peach)', 'var(--sage)', 'var(--blue)', 'var(--red)'];

interface SummaryPanelProps {
  messages: Message[];
  authors: string[];
}

export function SummaryPanel({ messages, authors }: SummaryPanelProps) {
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState(MODELS[0].value);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SummaryResult | null>(null);

  const dailyCounts = useMemo(() => computeDailyCounts(messages), [messages]);
  const busiestDays = dailyCounts.slice(0, 6);

  const dayMessages = useMemo(() => {
    if (!selectedDateKey) return [];
    return messages
      .filter((m) => !isNaN(m.timestamp.getTime()) && format(m.timestamp, 'yyyy-MM-dd') === selectedDateKey)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }, [messages, selectedDateKey]);

  async function handleGenerate() {
    if (!selectedDateKey || dayMessages.length === 0) return;
    setLoading(true);
    setError(null);
    setResult(null);

    const conversationText = dayMessages.map((m) => `[${format(m.timestamp, 'HH:mm')}] ${m.author}: ${m.content}`).join('\n');
    const dateLabel = format(new Date(selectedDateKey), 'EEEE, MMMM d, yyyy');

    try {
      const res = await summarizeDay({ apiKey, model, participants: authors, dateLabel, conversationText });
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong generating the summary.');
    } finally {
      setLoading(false);
    }
  }

  function handleDownload() {
    if (!result || !selectedDateKey) return;
    const cards = result.topics.length > 0 ? result.topics : [{ topic: 'Summary', summary: result.raw }];
    const body = cards.map((c) => `${c.topic}\n${'-'.repeat(c.topic.length)}\n${c.summary}`).join('\n\n');
    const text = `Conversation Summary\nDate: ${selectedDateKey}\nParticipants: ${authors.join(' and ')}\nMessages: ${dayMessages.length}\nModel: ${model}\n\n---\n\n${body}\n`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `summary_${selectedDateKey}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const cards = result ? (result.topics.length > 0 ? result.topics : [{ topic: 'Summary', summary: result.raw }]) : [];

  return (
    <div>
      <div className="section-label">Section 3 · AI Recaps</div>
      <h2>Daily Summaries</h2>
      <p style={{ marginBottom: '1.25rem' }}>
        Pick a day and Claude will read through it and split it back out into the different conversations you had.
      </p>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.78rem', opacity: 0.75 }}>
          Anthropic API key
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-ant-..."
            style={{ maxWidth: 340 }}
          />
        </label>

        {apiKey && (
          <>
            {busiestDays.length > 0 && (
              <div>
                <div style={{ fontSize: '0.78rem', opacity: 0.75, marginBottom: '0.5rem' }}>Busiest days. Pick one, or set a date below:</div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {busiestDays.map((d) => (
                    <button
                      key={d.dateKey}
                      className={`pill-toggle${selectedDateKey === d.dateKey ? ' active' : ''}`}
                      onClick={() => setSelectedDateKey(d.dateKey)}
                    >
                      {format(d.date, 'MMM d, yyyy')} · {d.count}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.78rem', opacity: 0.75, maxWidth: 220 }}>
              Or pick a specific date
              <input
                type="date"
                value={selectedDateKey ?? ''}
                onChange={(e) => setSelectedDateKey(e.target.value || null)}
              />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.78rem', opacity: 0.75, maxWidth: 340 }}>
              Model
              <select value={model} onChange={(e) => setModel(e.target.value)}>
                {MODELS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </label>

            {selectedDateKey && (
              <div style={{ fontSize: '0.82rem', opacity: 0.7 }}>
                {dayMessages.length > 0 ? `${dayMessages.length} messages on this day` : 'No messages on this day'}
              </div>
            )}

            <button className="btn" style={{ alignSelf: 'flex-start' }} disabled={!selectedDateKey || dayMessages.length === 0 || loading} onClick={handleGenerate}>
              {loading ? 'Reading through your messages...' : 'Summarize this day'}
            </button>
          </>
        )}

        {!apiKey && <div style={{ fontSize: '0.85rem', opacity: 0.6 }}>Paste your Anthropic API key to unlock day summaries. It's only used in your browser, never stored.</div>}

        {error && <div style={{ color: 'var(--red)', fontSize: '0.88rem' }}>{error}</div>}

        {result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
              {cards.map((c, i) => (
                <div
                  key={i}
                  style={{
                    background: 'var(--cream)',
                    borderRadius: 10,
                    borderTop: `3px solid ${CARD_ACCENTS[i % CARD_ACCENTS.length]}`,
                    padding: '1.1rem 1.25rem',
                  }}
                >
                  <div style={{ fontFamily: "'Cooper Md BT', serif", fontSize: '1.05rem', marginBottom: '0.4rem' }}>{c.topic}</div>
                  <div style={{ fontSize: '0.85rem', opacity: 0.85, lineHeight: 1.6 }}>{c.summary}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.78rem', opacity: 0.6 }}>
              <span>Input tokens: {result.usage.inputTokens}</span>
              <span>Output tokens: {result.usage.outputTokens}</span>
            </div>

            <button className="btn btn-ghost" style={{ alignSelf: 'flex-start' }} onClick={handleDownload}>
              💾 Download
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
