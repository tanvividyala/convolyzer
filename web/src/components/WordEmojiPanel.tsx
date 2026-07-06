import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import type { Turn } from '../types';
import { sliceByDate } from '../lib/turns';
import { computeTopEmojis, computeTopWords, wordUsageTrend } from '../lib/wordStats';
import { BarList } from './BarList';
import { LineChart } from './LineChart';

const COLORS = ['#f1a97a', '#5b8fc9', '#d85455', '#91ad94'];
const TABS = ['Track a word', 'Top words', 'Top emojis'] as const;
type Tab = (typeof TABS)[number];

const WORD_FREQS = ['Daily', 'Weekly', 'Monthly'] as const;
type WordFreq = (typeof WORD_FREQS)[number];

interface WordEmojiPanelProps {
  turns: Turn[];
  authors: string[];
}

export function WordEmojiPanel({ turns, authors }: WordEmojiPanelProps) {
  const [tab, setTab] = useState<Tab>('Track a word');

  return (
    <div>
      <div className="section-label">Section 3 · Language</div>
      <h2>Word &amp; Emoji Analysis</h2>
      <p style={{ marginBottom: '1.25rem' }}>Track a specific word over time, or see what comes up most often overall.</p>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {TABS.map((t) => (
          <button key={t} className={`pill-toggle${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Track a word' && <TrackWordTab turns={turns} authors={authors} />}
      {tab === 'Top words' && <TopWordsTab turns={turns} authors={authors} />}
      {tab === 'Top emojis' && <TopEmojisTab turns={turns} authors={authors} />}
    </div>
  );
}

function TrackWordTab({ turns, authors }: { turns: Turn[]; authors: string[] }) {
  const [word, setWord] = useState('lol');
  const [frequency, setFrequency] = useState<WordFreq>('Monthly');
  const [caseSensitive, setCaseSensitive] = useState(false);

  const trend = useMemo(() => wordUsageTrend(turns, authors, word, frequency, caseSensitive), [turns, authors, word, frequency, caseSensitive]);

  const totals = useMemo(() => {
    const t = Object.fromEntries(authors.map((a) => [a, 0]));
    for (const point of trend) for (const a of authors) t[a] += point.authorTotals[a] ?? 0;
    return t;
  }, [trend, authors]);
  const grandTotal = authors.reduce((sum, a) => sum + totals[a], 0);

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.78rem', opacity: 0.75 }}>
          Word or phrase to track
          <input type="text" value={word} onChange={(e) => setWord(e.target.value)} placeholder="lol" style={{ maxWidth: 200 }} />
        </label>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {WORD_FREQS.map((f) => (
            <button key={f} className={`pill-toggle${frequency === f ? ' active' : ''}`} onClick={() => setFrequency(f)}>
              {f}
            </button>
          ))}
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}>
          <input type="checkbox" checked={caseSensitive} onChange={(e) => setCaseSensitive(e.target.checked)} />
          Case sensitive
        </label>
      </div>

      {word.trim() === '' ? (
        <div style={{ opacity: 0.6, fontSize: '0.88rem' }}>Type a word or phrase above to see its trend.</div>
      ) : (
        <>
          <LineChart
            labels={trend.map((t) => t.label)}
            series={authors.map((a, i) => ({ name: a, color: COLORS[i % COLORS.length], values: trend.map((t) => t.byAuthor[a]) }))}
          />
          <div style={{ display: 'flex', gap: '1.75rem', flexWrap: 'wrap' }}>
            {authors.map((a) => (
              <Stat key={a} label={`${a}'s uses`} value={totals[a].toLocaleString()} />
            ))}
            <Stat label="Total uses" value={grandTotal.toLocaleString()} />
          </div>
        </>
      )}
    </div>
  );
}

function TopWordsTab({ turns, authors }: { turns: Turn[]; authors: string[] }) {
  const bounds = useMemo(() => (turns.length ? { min: turns[0].timestamp, max: turns[turns.length - 1].timestamp } : null), [turns]);
  const [start, setStart] = useState(() => (bounds ? format(bounds.min, 'yyyy-MM-dd') : ''));
  const [end, setEnd] = useState(() => (bounds ? format(bounds.max, 'yyyy-MM-dd') : ''));
  const [author, setAuthor] = useState('Everyone');
  const [count, setCount] = useState(10);
  const [customStopWords, setCustomStopWords] = useState('um, uh, like');

  const rangeTurns = useMemo(() => {
    if (!start || !end) return turns;
    return sliceByDate(turns, new Date(`${start}T00:00:00`), new Date(`${end}T23:59:59`));
  }, [turns, start, end]);

  const extraStopWords = useMemo(
    () => new Set(customStopWords.split(',').map((w) => w.trim().toLowerCase()).filter(Boolean)),
    [customStopWords]
  );

  const topWords = useMemo(
    () => computeTopWords(rangeTurns, { author, limit: count, extraStopWords }),
    [rangeTurns, author, count, extraStopWords]
  );

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.78rem', opacity: 0.75 }}>
          From
          <input type="date" value={start} min={bounds ? format(bounds.min, 'yyyy-MM-dd') : undefined} max={end} onChange={(e) => setStart(e.target.value)} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.78rem', opacity: 0.75 }}>
          To
          <input type="date" value={end} min={start} max={bounds ? format(bounds.max, 'yyyy-MM-dd') : undefined} onChange={(e) => setEnd(e.target.value)} />
        </label>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className={`pill-toggle${author === 'Everyone' ? ' active' : ''}`} onClick={() => setAuthor('Everyone')}>
            Everyone
          </button>
          {authors.map((a) => (
            <button key={a} className={`pill-toggle${author === a ? ' active' : ''}`} onClick={() => setAuthor(a)}>
              {a}
            </button>
          ))}
        </div>
      </div>

      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.78rem', opacity: 0.75, maxWidth: 360 }}>
        How many words: {count}
        <input type="range" min={5} max={50} step={5} value={count} onChange={(e) => setCount(Number(e.target.value))} />
      </label>

      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.78rem', opacity: 0.75 }}>
        Words to exclude (comma-separated)
        <input type="text" value={customStopWords} onChange={(e) => setCustomStopWords(e.target.value)} style={{ maxWidth: 420 }} />
      </label>

      <BarList items={topWords.map((w) => ({ label: w.word, value: w.count }))} />
    </div>
  );
}

function TopEmojisTab({ turns, authors }: { turns: Turn[]; authors: string[] }) {
  const bounds = useMemo(() => (turns.length ? { min: turns[0].timestamp, max: turns[turns.length - 1].timestamp } : null), [turns]);
  const [start, setStart] = useState(() => (bounds ? format(bounds.min, 'yyyy-MM-dd') : ''));
  const [end, setEnd] = useState(() => (bounds ? format(bounds.max, 'yyyy-MM-dd') : ''));
  const [author, setAuthor] = useState('Everyone');
  const [count, setCount] = useState(10);

  const rangeTurns = useMemo(() => {
    if (!start || !end) return turns;
    return sliceByDate(turns, new Date(`${start}T00:00:00`), new Date(`${end}T23:59:59`));
  }, [turns, start, end]);

  const topEmojis = useMemo(() => computeTopEmojis(rangeTurns, { author, limit: count }), [rangeTurns, author, count]);

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.78rem', opacity: 0.75 }}>
          From
          <input type="date" value={start} min={bounds ? format(bounds.min, 'yyyy-MM-dd') : undefined} max={end} onChange={(e) => setStart(e.target.value)} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.78rem', opacity: 0.75 }}>
          To
          <input type="date" value={end} min={start} max={bounds ? format(bounds.max, 'yyyy-MM-dd') : undefined} onChange={(e) => setEnd(e.target.value)} />
        </label>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className={`pill-toggle${author === 'Everyone' ? ' active' : ''}`} onClick={() => setAuthor('Everyone')}>
            Everyone
          </button>
          {authors.map((a) => (
            <button key={a} className={`pill-toggle${author === a ? ' active' : ''}`} onClick={() => setAuthor(a)}>
              {a}
            </button>
          ))}
        </div>
      </div>

      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.78rem', opacity: 0.75, maxWidth: 360 }}>
        How many emojis: {count}
        <input type="range" min={5} max={50} step={5} value={count} onChange={(e) => setCount(Number(e.target.value))} />
      </label>

      <BarList items={topEmojis.map((e) => ({ label: e.emoji, value: e.count }))} color="#d85455" />
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
