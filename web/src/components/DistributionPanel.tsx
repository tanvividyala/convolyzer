import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import type { Turn } from '../types';
import { sliceByDate } from '../lib/turns';
import { buildProportionTrend } from '../lib/distribution';
import { DonutChart } from './DonutChart';
import { StackedAreaChart } from './StackedAreaChart';

const COLORS = ['#f1a97a', '#5b8fc9', '#d85455', '#91ad94'];
const FREQUENCIES = ['Daily', 'Weekly', 'Monthly'] as const;
type ProportionFrequency = (typeof FREQUENCIES)[number];

interface DistributionPanelProps {
  turns: Turn[];
  authors: string[];
}

export function DistributionPanel({ turns, authors }: DistributionPanelProps) {
  const bounds = useMemo(() => (turns.length ? { min: turns[0].timestamp, max: turns[turns.length - 1].timestamp } : null), [turns]);
  const [start, setStart] = useState(() => (bounds ? format(bounds.min, 'yyyy-MM-dd') : ''));
  const [end, setEnd] = useState(() => (bounds ? format(bounds.max, 'yyyy-MM-dd') : ''));
  const [frequency, setFrequency] = useState<ProportionFrequency>('Weekly');

  const rangeTurns = useMemo(() => {
    if (!start || !end) return turns;
    return sliceByDate(turns, new Date(`${start}T00:00:00`), new Date(`${end}T23:59:59`));
  }, [turns, start, end]);

  const counts = useMemo(() => {
    const c = Object.fromEntries(authors.map((a) => [a, 0]));
    for (const t of rangeTurns) if (c[t.author] !== undefined) c[t.author] += 1;
    return c;
  }, [rangeTurns, authors]);

  const trend = useMemo(() => buildProportionTrend(rangeTurns, authors, frequency), [rangeTurns, authors, frequency]);

  return (
    <div>
      <div className="section-label">Section 2 · Distribution</div>
      <h2>Who's Talking More?</h2>
      <p style={{ marginBottom: '1.25rem' }}>Message share within a date range, overall and broken out over time.</p>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.78rem', opacity: 0.75 }}>
            From
            <input type="date" value={start} min={bounds ? format(bounds.min, 'yyyy-MM-dd') : undefined} max={end} onChange={(e) => setStart(e.target.value)} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.78rem', opacity: 0.75 }}>
            To
            <input type="date" value={end} min={start} max={bounds ? format(bounds.max, 'yyyy-MM-dd') : undefined} onChange={(e) => setEnd(e.target.value)} />
          </label>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {FREQUENCIES.map((f) => (
              <button key={f} className={`pill-toggle${frequency === f ? ' active' : ''}`} onClick={() => setFrequency(f)}>
                {f}
              </button>
            ))}
          </div>
        </div>

        <DonutChart size={180} data={authors.map((a) => ({ label: a, value: counts[a] ?? 0 }))} />

        <StackedAreaChart
          labels={trend.map((t) => t.label)}
          series={authors.map((a, i) => ({ name: a, color: COLORS[i % COLORS.length], values: trend.map((t) => t.byAuthor[a]) }))}
        />
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {authors.map((a, i) => (
            <div key={a} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: COLORS[i % COLORS.length] }} />
              {a}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
