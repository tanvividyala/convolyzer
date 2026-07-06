import type { QuickStats as QuickStatsData } from '../lib/stats';
import { DonutChart } from './DonutChart';

interface QuickStatsProps {
  stats: QuickStatsData;
  authors: string[];
}

export function QuickStats({ stats, authors }: QuickStatsProps) {
  return (
    <div className="card" style={{ display: 'flex', flexWrap: 'wrap', gap: '2.5rem', alignItems: 'center' }}>
      <div style={{ display: 'flex', gap: '1.75rem', flexWrap: 'wrap' }}>
        <Metric label="Total messages" value={stats.total} />
        {authors.map((a) => (
          <Metric key={a} label={`${a}'s messages`} value={stats.perAuthor[a] ?? 0} />
        ))}
        <Metric label="Days of conversation" value={stats.daysSpanned} />
      </div>
      <DonutChart size={160} data={authors.map((a) => ({ label: a, value: stats.perAuthor[a] ?? 0 }))} />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div style={{ fontFamily: "'Cooper Md BT', serif", fontSize: '1.8rem' }}>{value.toLocaleString()}</div>
      <div style={{ fontSize: '0.78rem', opacity: 0.65 }}>{label}</div>
    </div>
  );
}
