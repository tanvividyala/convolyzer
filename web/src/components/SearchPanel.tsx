import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import type { Turn, SearchHit } from '../types';
import { sliceByDate } from '../lib/turns';
import { buildIndex, search, rangeKey, type SearchIndex } from '../lib/search';
import type { LoadProgress } from '../lib/embeddings';

interface SearchPanelProps {
  turns: Turn[];
}

export function SearchPanel({ turns }: SearchPanelProps) {
  const bounds = useMemo(() => {
    if (turns.length === 0) return null;
    return { min: turns[0].timestamp, max: turns[turns.length - 1].timestamp };
  }, [turns]);

  const [start, setStart] = useState(() => (bounds ? format(bounds.min, 'yyyy-MM-dd') : ''));
  const [end, setEnd] = useState(() => (bounds ? format(bounds.max, 'yyyy-MM-dd') : ''));

  const [index, setIndex] = useState<SearchIndex | null>(null);
  const [building, setBuilding] = useState(false);
  const [progress, setProgress] = useState<LoadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const rangeTurns = useMemo(() => {
    if (!start || !end) return turns;
    const s = new Date(`${start}T00:00:00`);
    const e = new Date(`${end}T23:59:59`);
    return sliceByDate(turns, s, e);
  }, [turns, start, end]);

  const currentKey = start && end ? rangeKey(new Date(start), new Date(end)) : '';
  const indexStale = index != null && index.rangeKey !== currentKey;

  async function build() {
    setBuilding(true);
    setError(null);
    setHits(null);
    try {
      const idx = await buildIndex(rangeTurns, currentKey, setProgress);
      setIndex(idx);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to build the search index.');
    } finally {
      setBuilding(false);
      setProgress(null);
    }
  }

  async function runSearch() {
    if (!index || !query.trim()) return;
    setSearching(true);
    setError(null);
    try {
      setHits(await search(index, query));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed.');
    } finally {
      setSearching(false);
    }
  }

  return (
    <div>
      <div className="section-label">Section 6 · Search</div>
      <h2>Semantic Search</h2>
      <p style={{ marginBottom: '1.25rem' }}>
        Ask "when did we talk about X" and get the relevant moments back, matched by meaning, not just exact words. Pick a date range,
        build the index once, then search. Everything runs in your browser.
      </p>

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
          <button className="btn" disabled={building || rangeTurns.length === 0} onClick={build}>
            {building ? 'Building…' : indexStale || !index ? `Build index (${rangeTurns.length} msgs)` : 'Rebuild index'}
          </button>
        </div>

        <div style={{ fontSize: '0.78rem', opacity: 0.65 }}>
          The first build downloads a ~25 MB embedding model, then caches it. {rangeTurns.length} messages in this range.
        </div>

        {progress && (
          <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>
            {progress.message}
            {progress.progress != null && (
              <span style={{ display: 'inline-block', width: 120, height: 6, background: 'var(--cream-dark)', borderRadius: 4, marginLeft: 8, verticalAlign: 'middle' }}>
                <span style={{ display: 'block', width: `${Math.round(progress.progress * 100)}%`, height: '100%', background: 'var(--peach)', borderRadius: 4 }} />
              </span>
            )}
          </div>
        )}
        {error && <div style={{ color: 'var(--red)', fontSize: '0.85rem' }}>{error}</div>}

        {index && (
          <>
            {indexStale && <div style={{ fontSize: '0.8rem', color: 'var(--red)', opacity: 0.85 }}>Date range changed. Rebuild the index to search it.</div>}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && runSearch()}
                placeholder="e.g. planning a trip, an argument, someone's birthday…"
                style={{ flex: 1, minWidth: 240 }}
              />
              <button className="btn" disabled={searching || !query.trim()} onClick={runSearch}>
                {searching ? 'Searching…' : 'Search'}
              </button>
            </div>

            {hits && hits.length === 0 && <div style={{ fontSize: '0.88rem', opacity: 0.7 }}>No matches in this range.</div>}

            {hits && hits.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {hits.map((hit) => (
                  <div key={hit.chunk.chunkId} style={{ background: 'var(--cream)', borderRadius: 10, padding: '1rem 1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                      <span style={{ fontSize: '0.76rem', opacity: 0.65, fontFamily: 'DM Mono, monospace' }}>
                        {format(hit.chunk.startTime, 'MMM d, yyyy')} · turns {hit.chunk.startTurn}–{hit.chunk.endTurn}
                      </span>
                      <span className="chip">{(hit.score * 100).toFixed(0)}% match</span>
                    </div>
                    <div style={{ fontSize: '0.86rem', lineHeight: 1.55, whiteSpace: 'pre-wrap', opacity: 0.9 }}>
                      {expanded === hit.chunk.chunkId ? hit.chunk.text : hit.chunk.preview + (hit.chunk.text.length > hit.chunk.preview.length ? '…' : '')}
                    </div>
                    {hit.chunk.text.length > hit.chunk.preview.length && (
                      <button
                        className="btn btn-ghost"
                        style={{ padding: '0.2rem 0.6rem', fontSize: '0.72rem', marginTop: '0.5rem' }}
                        onClick={() => setExpanded((cur) => (cur === hit.chunk.chunkId ? null : hit.chunk.chunkId))}
                      >
                        {expanded === hit.chunk.chunkId ? 'Show less' : 'Show full passage'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
