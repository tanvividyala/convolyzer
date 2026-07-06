import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import type { Turn, Pattern, PatternFlag } from '../types';
import { detectPatterns, countByPatternAndAuthor, NEGATIVE_PATTERNS, POSITIVE_PATTERNS, PATTERN_COLORS, PATTERN_LABELS } from '../lib/patterns';
import { PatternTimeline } from './PatternTimeline';

const MODELS = [
  { value: 'claude-sonnet-5', label: 'Claude Sonnet 5 (recommended)' },
  { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 (cheaper)' },
  { value: 'claude-opus-4-8', label: 'Claude Opus 4.8 (most capable)' },
];

interface PatternsPanelProps {
  turns: Turn[];
  authors: string[];
}

export function PatternsPanel({ turns, authors }: PatternsPanelProps) {
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState(MODELS[0].value);
  const [flags, setFlags] = useState<PatternFlag[] | null>(null);
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());
  const [usage, setUsage] = useState<{ inputTokens: number; outputTokens: number } | null>(null);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTurn, setActiveTurn] = useState<number | null>(null);

  const visibleFlags = useMemo(() => (flags ?? []).filter((f) => !dismissed.has(f.turnIndex)), [flags, dismissed]);
  const counts = useMemo(() => countByPatternAndAuthor(visibleFlags, authors), [visibleFlags, authors]);

  async function run() {
    if (!apiKey) return;
    setRunning(true);
    setError(null);
    setFlags(null);
    setDismissed(new Set());
    setProgress({ done: 0, total: 1 });
    try {
      const res = await detectPatterns({ apiKey, model, turns, onProgress: (done, total) => setProgress({ done, total }) });
      setFlags(res.flags);
      setUsage(res.usage);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to detect patterns.');
    } finally {
      setRunning(false);
      setProgress(null);
    }
  }

  const activeFlags = visibleFlags.filter((f) => f.turnIndex === activeTurn);

  return (
    <div>
      <div className="section-label">Section 5 · Communication</div>
      <h2>Communication Patterns Observed</h2>
      <p style={{ marginBottom: '0.5rem' }}>
        Claude scans for patterns from Gottman's relationship research — criticism, defensiveness, contempt, stonewalling, and the healthier
        counterparts of validation and repair attempts.
      </p>
      <p style={{ fontSize: '0.82rem', opacity: 0.7, marginBottom: '1.25rem' }}>
        These are observations, not a diagnosis. A model can misread sarcasm between close friends, so treat every flag as a prompt to look,
        not a verdict — and mark the ones it gets wrong.
      </p>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.78rem', opacity: 0.75 }}>
          Anthropic API key
          <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-ant-..." style={{ maxWidth: 340 }} />
        </label>

        {apiKey && (
          <>
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
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <button className="btn" disabled={running} onClick={run} style={{ alignSelf: 'flex-start' }}>
                {running ? 'Scanning…' : flags ? 'Re-scan conversation' : `Scan ${turns.length} messages`}
              </button>
              {progress && (
                <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                  chunk {progress.done} / {progress.total}
                </span>
              )}
              {usage && (
                <span style={{ fontSize: '0.78rem', opacity: 0.6 }}>
                  {usage.inputTokens.toLocaleString()} in · {usage.outputTokens.toLocaleString()} out
                </span>
              )}
            </div>
          </>
        )}

        {!apiKey && <div style={{ fontSize: '0.85rem', opacity: 0.6 }}>Paste your Anthropic API key to run pattern detection. It's only used in your browser.</div>}
        {error && <div style={{ color: 'var(--red)', fontSize: '0.85rem' }}>{error}</div>}

        {flags && (
          <>
            {visibleFlags.length === 0 ? (
              <div style={{ fontSize: '0.88rem', opacity: 0.7 }}>No clear patterns flagged in this conversation.</div>
            ) : (
              <>
                <PatternTimeline flags={visibleFlags} totalTurns={turns.length} activeTurn={activeTurn} onSelect={setActiveTurn} />

                {activeFlags.length > 0 && (
                  <div style={{ background: 'var(--cream)', borderRadius: 10, padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {activeFlags.map((f, i) => (
                      <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span className="chip" style={{ background: PATTERN_COLORS[f.pattern], color: '#fff' }}>
                            {PATTERN_LABELS[f.pattern]}
                          </span>
                          <span style={{ fontSize: '0.78rem', opacity: 0.7 }}>
                            {f.author} · {format(f.timestamp, 'MMM d, yyyy')} · {(f.confidence * 100).toFixed(0)}% conf
                          </span>
                          <button className="btn btn-ghost" style={{ padding: '0.2rem 0.6rem', fontSize: '0.72rem' }} onClick={() => setDismissed((d) => new Set(d).add(f.turnIndex))}>
                            Mark incorrect
                          </button>
                        </div>
                        <div style={{ fontSize: '0.88rem', fontStyle: 'italic', opacity: 0.9 }}>"{f.excerpt}"</div>
                      </div>
                    ))}
                  </div>
                )}

                <PatternSummary counts={counts} authors={authors} />

                <div style={{ fontSize: '0.78rem', opacity: 0.6 }}>
                  {visibleFlags.length} flags shown{dismissed.size > 0 ? ` · ${dismissed.size} marked incorrect` : ''}. Click a marker on the timeline to see its excerpt.
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function PatternSummary({ counts, authors }: { counts: Record<Pattern, Record<string, number>>; authors: string[] }) {
  const total = (p: Pattern) => authors.reduce((s, a) => s + (counts[p][a] ?? 0), 0);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
      <SummaryColumn title="Friction" patterns={NEGATIVE_PATTERNS} counts={counts} authors={authors} total={total} />
      <SummaryColumn title="Repair & warmth" patterns={POSITIVE_PATTERNS} counts={counts} authors={authors} total={total} />
    </div>
  );
}

function SummaryColumn({
  title,
  patterns,
  counts,
  authors,
  total,
}: {
  title: string;
  patterns: Pattern[];
  counts: Record<Pattern, Record<string, number>>;
  authors: string[];
  total: (p: Pattern) => number;
}) {
  return (
    <div style={{ background: 'var(--cream)', borderRadius: 10, padding: '1rem 1.25rem' }}>
      <div style={{ fontFamily: "'Cooper Md BT', serif", fontSize: '0.98rem', marginBottom: '0.6rem' }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {patterns.map((p) => (
          <div key={p} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: PATTERN_COLORS[p] }} />
              {PATTERN_LABELS[p]}
            </span>
            <span style={{ fontSize: '0.8rem', opacity: 0.75 }}>
              {total(p)}
              {total(p) > 0 && <span style={{ opacity: 0.6 }}> ({authors.map((a) => `${a}: ${counts[p][a] ?? 0}`).join(', ')})</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
