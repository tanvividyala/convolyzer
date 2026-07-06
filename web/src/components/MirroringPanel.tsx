import { useMemo, useState } from 'react';
import type { Turn, MirrorWindow } from '../types';
import { topTwoAuthors } from '../lib/turns';
import { computeMirroring, featureGap } from '../lib/mirroring';
import type { LoadProgress } from '../lib/embeddings';
import { SentimentChart } from './SentimentChart';

interface MirroringPanelProps {
  turns: Turn[];
  authors: string[];
}

export function MirroringPanel({ turns, authors }: MirroringPanelProps) {
  const speakers = useMemo<[string, string]>(() => {
    if (authors.length === 2) return [authors[0], authors[1]];
    const [a, b] = topTwoAuthors(turns);
    return [a, b];
  }, [authors, turns]);

  const [windows, setWindows] = useState<MirrorWindow[] | null>(null);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<LoadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setRunning(true);
    setError(null);
    try {
      const res = await computeMirroring(turns, speakers, setProgress);
      setWindows(res.windows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to compute mirroring.');
    } finally {
      setRunning(false);
      setProgress(null);
    }
  }

  const scored = useMemo(() => windows?.filter((w) => w.similarity != null) ?? [], [windows]);
  const labels = windows?.map((w) => w.label) ?? [];

  const trendNote = useMemo(() => {
    if (scored.length < 2) return null;
    const half = Math.floor(scored.length / 2);
    const early = scored.slice(0, half).reduce((s, w) => s + (w.similarity ?? 0), 0) / half;
    const late = scored.slice(half).reduce((s, w) => s + (w.similarity ?? 0), 0) / (scored.length - half);
    const delta = late - early;
    if (delta > 0.03) return 'Similarity rises over time — the two styles are converging (accommodation).';
    if (delta < -0.03) return 'Similarity falls over time — the two styles are diverging.';
    return 'Similarity stays roughly flat over time.';
  }, [scored]);

  return (
    <div>
      <div className="section-label">Section 4 · Mirroring</div>
      <h2>Linguistic Accommodation</h2>
      <p style={{ marginBottom: '1.25rem' }}>
        How much {speakers[0]} and {speakers[1]} shift their language toward each other over time. Each window's score is the cosine
        similarity of the two speakers' text embeddings; a rising line means they're starting to sound more alike.
      </p>

      {authors.length > 2 && (
        <div style={{ fontSize: '0.82rem', opacity: 0.7, marginBottom: '0.75rem' }}>
          This is a two-person analysis, so it's scoped to the two most active speakers: {speakers[0]} and {speakers[1]}.
        </div>
      )}

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {!windows && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ fontSize: '0.85rem', opacity: 0.75 }}>
              This runs an embedding model in your browser (~25 MB download the first time, then cached). Nothing leaves your device.
            </div>
            <button className="btn" style={{ alignSelf: 'flex-start' }} disabled={running} onClick={run}>
              {running ? 'Working…' : 'Build accommodation timeline'}
            </button>
            {progress && <ProgressLine p={progress} />}
            {error && <div style={{ color: 'var(--red)', fontSize: '0.85rem' }}>{error}</div>}
          </div>
        )}

        {windows && (
          <>
            <SentimentChart
              labels={labels}
              domain={[0, 1]}
              ticks={[1, 0.75, 0.5, 0.25, 0]}
              series={[
                { name: 'Style similarity', color: '#5b8fc9', values: windows.map((w) => w.similarity) },
                { name: 'Sentence-length gap', color: '#f1a97a', values: featureGap(windows, 'avgSentenceLength') },
                { name: 'Emoji-rate gap', color: '#91ad94', values: featureGap(windows, 'emojiRate') },
              ]}
            />
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              {[
                ['Style similarity', '#5b8fc9'],
                ['Sentence-length gap', '#f1a97a'],
                ['Emoji-rate gap', '#91ad94'],
              ].map(([name, color]) => (
                <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
                  {name}
                </div>
              ))}
            </div>
            {trendNote && <div style={{ fontSize: '0.85rem', opacity: 0.85 }}>{trendNote}</div>}
            <div style={{ fontSize: '0.78rem', opacity: 0.6 }}>
              {scored.length} of {windows.length} windows scored. Windows where one speaker sent fewer than 3 messages are left as gaps.
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ProgressLine({ p }: { p: LoadProgress }) {
  return (
    <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>
      {p.message}
      {p.progress != null && (
        <span style={{ display: 'inline-block', width: 120, height: 6, background: 'var(--cream-dark)', borderRadius: 4, marginLeft: 8, verticalAlign: 'middle' }}>
          <span style={{ display: 'block', width: `${Math.round(p.progress * 100)}%`, height: '100%', background: 'var(--peach)', borderRadius: 4 }} />
        </span>
      )}
    </div>
  );
}
