import { useMemo, useState } from 'react';
import type { Message } from '../types';

interface AuthorMapperProps {
  messages: Message[];
  onConfirm: (messages: Message[], selectedAuthors: string[]) => void;
}

export function AuthorMapper({ messages, onConfirm }: AuthorMapperProps) {
  const rawAuthors = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of messages) counts.set(m.author, (counts.get(m.author) ?? 0) + 1);
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([author, count]) => ({ author, count }));
  }, [messages]);

  const [aliasMap, setAliasMap] = useState<Record<string, string>>(() => Object.fromEntries(rawAuthors.map((a) => [a.author, a.author])));

  const canonicalAuthors = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of messages) {
      const canonical = (aliasMap[m.author] ?? m.author).trim() || m.author;
      counts.set(canonical, (counts.get(canonical) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([author, count]) => ({ author, count }));
  }, [messages, aliasMap]);

  const [selected, setSelected] = useState<string[]>([]);

  const effectiveSelected = canonicalAuthors.length === 2 ? canonicalAuthors.map((a) => a.author) : selected;

  function toggleSelected(author: string) {
    setSelected((prev) => (prev.includes(author) ? prev.filter((a) => a !== author) : [...prev, author]));
  }

  function handleContinue() {
    const mapped = messages.map((m) => ({ ...m, author: (aliasMap[m.author] ?? m.author).trim() || m.author }));
    const filtered = mapped.filter((m) => effectiveSelected.includes(m.author));
    onConfirm(filtered, effectiveSelected);
  }

  return (
    <section style={{ maxWidth: 760, margin: '0 auto', padding: '0 2rem 2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <div className="section-label">Step 2 · Match people across platforms</div>
        <h2>Who's who?</h2>
        <p>
          Found {rawAuthors.length} distinct name{rawAuthors.length === 1 ? '' : 's'} across your files. If the same person shows up under
          different names on different platforms, rename them to match so they're counted as one.
        </p>
      </div>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {rawAuthors.map(({ author, count }) => (
          <div key={author} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ flex: '0 0 40%', fontSize: '0.88rem', opacity: 0.75 }}>
              {author} <span style={{ opacity: 0.5 }}>({count})</span>
            </span>
            <span style={{ opacity: 0.4 }}>→</span>
            <input
              type="text"
              value={aliasMap[author] ?? author}
              onChange={(e) => setAliasMap((prev) => ({ ...prev, [author]: e.target.value }))}
              style={{ flex: 1 }}
            />
          </div>
        ))}
      </div>

      {canonicalAuthors.length < 2 && (
        <div className="chip" style={{ background: 'var(--peach-light)' }}>
          Need at least 2 distinct people to compare. Rename some entries above so they don't all collapse into one.
        </div>
      )}

      {canonicalAuthors.length === 2 && (
        <div className="chip" style={{ width: 'fit-content' }}>
          Analyzing: <strong>&nbsp;{canonicalAuthors[0].author}</strong> &amp; <strong>{canonicalAuthors[1].author}</strong>
        </div>
      )}

      {canonicalAuthors.length > 2 && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <div style={{ fontSize: '0.85rem', opacity: 0.7 }}>Pick 2 or more people to compare:</div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {canonicalAuthors.map(({ author, count }) => (
              <button
                key={author}
                className={`pill-toggle${selected.includes(author) ? ' active' : ''}`}
                onClick={() => toggleSelected(author)}
              >
                {author} ({count})
              </button>
            ))}
          </div>
        </div>
      )}

      <button className="btn" disabled={canonicalAuthors.length < 2 || effectiveSelected.length < 2} onClick={handleContinue} style={{ alignSelf: 'flex-start' }}>
        Continue to dashboard →
      </button>
    </section>
  );
}
