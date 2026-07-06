import { useMemo, useState } from 'react';
import type { Turn } from '../types';
import { scoreLocal } from '../lib/sentiment';
import { dailyAggregates, sentimentTrend } from '../lib/sentimentAgg';
import { MoodCalendar } from './MoodCalendar';
import { SentimentChart } from './SentimentChart';

const COLORS = ['#f1a97a', '#5b8fc9', '#d85455', '#91ad94'];
const TREND_FREQS = ['Daily', 'Weekly', 'Monthly'] as const;
type TrendFreq = (typeof TREND_FREQS)[number];

interface SentimentPanelProps {
  turns: Turn[];
  authors: string[];
}

export function SentimentPanel({ turns, authors }: SentimentPanelProps) {
  const scores = useMemo(() => scoreLocal(turns), [turns]);

  const [minMessages, setMinMessages] = useState(3);
  const [view, setView] = useState<'calendar' | 'trend'>('calendar');
  const [trendFreq, setTrendFreq] = useState<TrendFreq>('Weekly');
  const [overallOnly, setOverallOnly] = useState(true);

  const daily = useMemo(() => dailyAggregates(turns, scores).filter((d) => d.count >= minMessages), [turns, scores, minMessages]);
  const years = useMemo(() => Array.from(new Set(daily.map((d) => d.date.getFullYear()))).sort((a, b) => b - a), [daily]);
  const [year, setYear] = useState<number | null>(null);
  const activeYear = year ?? years[0] ?? new Date().getFullYear();

  const trend = useMemo(() => sentimentTrend(turns, scores, authors, trendFreq), [turns, scores, authors, trendFreq]);

  const summary = useMemo(() => {
    if (daily.length === 0) return null;
    const avg = daily.reduce((s, d) => s + d.avgSentiment, 0) / daily.length;
    const pos = daily.filter((d) => d.avgSentiment > 0.15).length;
    const neg = daily.filter((d) => d.avgSentiment < -0.15).length;
    return { avg, pos, neg };
  }, [daily]);

  return (
    <div>
      <div className="section-label">Section 3 · Sentiment</div>
      <h2>Emotional Trajectory</h2>
      <p style={{ marginBottom: '1.25rem' }}>
        A sentiment score for every message, scored instantly in your browser, rolled up into a year-view mood grid and a trend line.
        Sarcasm and inside jokes will fool any scorer, so read it as a vibe, not a verdict.
      </p>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className={`pill-toggle${view === 'calendar' ? ' active' : ''}`} onClick={() => setView('calendar')}>
            📅 Mood calendar
          </button>
          <button className={`pill-toggle${view === 'trend' ? ' active' : ''}`} onClick={() => setView('trend')}>
            📈 Trend line
          </button>
        </div>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.78rem', opacity: 0.75, maxWidth: 360 }}>
          Minimum messages per day to include: {minMessages}
          <input type="range" min={1} max={20} value={minMessages} onChange={(e) => setMinMessages(Number(e.target.value))} />
        </label>

        {daily.length === 0 ? (
          <div style={{ fontSize: '0.88rem', opacity: 0.65 }}>No days meet the minimum-message threshold. Try lowering it.</div>
        ) : view === 'calendar' ? (
          <>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.78rem', opacity: 0.7 }}>Year:</span>
              {years.map((y) => (
                <button key={y} className={`pill-toggle${activeYear === y ? ' active' : ''}`} onClick={() => setYear(y)}>
                  {y}
                </button>
              ))}
            </div>
            <MoodCalendar year={activeYear} daily={daily} />
            {summary && (
              <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                <Stat label="Avg sentiment" value={summary.avg.toFixed(2)} />
                <Stat label="Positive days" value={String(summary.pos)} />
                <Stat label="Negative days" value={String(summary.neg)} />
              </div>
            )}
          </>
        ) : (
          <>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              {TREND_FREQS.map((f) => (
                <button key={f} className={`pill-toggle${trendFreq === f ? ' active' : ''}`} onClick={() => setTrendFreq(f)}>
                  {f}
                </button>
              ))}
              <button className={`pill-toggle${overallOnly ? ' active' : ''}`} onClick={() => setOverallOnly((v) => !v)}>
                {overallOnly ? 'Overall' : 'By person'}
              </button>
            </div>
            <SentimentChart
              labels={trend.map((t) => t.label)}
              series={
                overallOnly
                  ? [{ name: 'Overall', color: COLORS[0], values: trend.map((t) => t.overall) }]
                  : authors.map((a, i) => ({ name: a, color: COLORS[i % COLORS.length], values: trend.map((t) => t.byAuthor[a]) }))
              }
            />
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontFamily: "'Cooper Md BT', serif", fontSize: '1.6rem' }}>{value}</div>
      <div style={{ fontSize: '0.76rem', opacity: 0.65 }}>{label}</div>
    </div>
  );
}
