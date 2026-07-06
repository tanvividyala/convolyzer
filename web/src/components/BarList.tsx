interface BarListProps {
  items: { label: string; value: number }[];
  color?: string;
}

export function BarList({ items, color = 'var(--peach)' }: BarListProps) {
  const max = Math.max(1, ...items.map((i) => i.value));

  if (items.length === 0) {
    return <div style={{ opacity: 0.6, fontSize: '0.88rem' }}>Nothing found for this filter.</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {items.map((it, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: 110, fontSize: '0.9rem', textAlign: 'right', flexShrink: 0, fontFamily: "'DM Mono', monospace" }} title={it.label}>
            {it.label}
          </div>
          <div style={{ flex: 1, background: 'var(--cream-dark)', borderRadius: 6, overflow: 'hidden', height: 22 }}>
            <div style={{ width: `${(it.value / max) * 100}%`, background: color, height: '100%', borderRadius: 6 }} />
          </div>
          <div style={{ width: 44, fontSize: '0.8rem', opacity: 0.7 }}>{it.value.toLocaleString()}</div>
        </div>
      ))}
    </div>
  );
}
