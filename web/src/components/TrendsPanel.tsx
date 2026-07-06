import { useMemo, useState } from 'react';
import type { Frequency, Message } from '../types';
import { buildTrend } from '../lib/dateBuckets';
import { LineChart } from './LineChart';

const FREQUENCIES: Frequency[] = ['Daily', 'Weekly', 'Monthly', 'Yearly'];
const COLORS = ['#f1a97a', '#5b8fc9', '#d85455', '#91ad94'];

interface TrendsPanelProps {
  messages: Message[];
  authors: string[];
}

export function TrendsPanel({ messages, authors }: TrendsPanelProps) {
  const [frequency, setFrequency] = useState<Frequency>('Monthly');

  const trend = useMemo(() => buildTrend(messages, authors, frequency), [messages, authors, frequency]);

  const labels = trend.map((t) => t.label);
  const series = authors.map((author, i) => ({
    name: author,
    color: COLORS[i % COLORS.length],
    values: trend.map((t) => t.byAuthor[author] ?? 0),
  }));

  return (
    <div>
      <div className="section-label">Section 1 · Activity</div>
      <h2>Messages Over Time</h2>
      <div className="card">
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          {FREQUENCIES.map((f) => (
            <button key={f} className={`pill-toggle${frequency === f ? ' active' : ''}`} onClick={() => setFrequency(f)}>
              {f}
            </button>
          ))}
        </div>
        <LineChart labels={labels} series={series} />
        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
          {series.map((s) => (
            <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: s.color }} />
              {s.name}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
