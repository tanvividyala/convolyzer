interface Series {
  name: string;
  color: string;
  values: number[]; // percentages per index; should sum to <=100 across series at each index
}

interface StackedAreaChartProps {
  labels: string[];
  series: Series[];
  height?: number;
}

const WIDTH = 800;
const PAD_LEFT = 44;
const PAD_RIGHT = 16;
const PAD_TOP = 16;
const PAD_BOTTOM = 32;
const TICKS = [0, 25, 50, 75, 100];

/** Stacked percentage area chart, 0-100 fixed domain. */
export function StackedAreaChart({ labels, series, height = 320 }: StackedAreaChartProps) {
  const plotWidth = WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotHeight = height - PAD_TOP - PAD_BOTTOM;
  const n = labels.length;

  const xFor = (i: number) => PAD_LEFT + (n <= 1 ? plotWidth / 2 : (i / (n - 1)) * plotWidth);
  const yFor = (v: number) => PAD_TOP + plotHeight * (1 - v / 100);

  const tickEvery = Math.max(1, Math.ceil(n / 8));

  if (n === 0) {
    return <div style={{ opacity: 0.6, fontSize: '0.88rem' }}>Not enough data to plot yet.</div>;
  }

  let running = new Array(n).fill(0);
  const bands = series.map((s) => {
    const bottom = running;
    const top = running.map((r, i) => r + (s.values[i] ?? 0));
    running = top;
    return { series: s, bottom, top };
  });

  return (
    <svg width="100%" viewBox={`0 0 ${WIDTH} ${height}`} style={{ display: 'block', overflow: 'visible' }}>
      {TICKS.map((v) => {
        const y = yFor(v);
        return (
          <g key={v}>
            <line x1={PAD_LEFT} y1={y} x2={WIDTH - PAD_RIGHT} y2={y} stroke="var(--sage-light)" strokeWidth={1} opacity={0.6} />
            <text x={PAD_LEFT - 8} y={y + 4} textAnchor="end" fontSize={11} fill="var(--green-dark)" opacity={0.55} fontFamily="DM Mono, monospace">
              {v}%
            </text>
          </g>
        );
      })}

      {labels.map((label, i) =>
        i % tickEvery === 0 ? (
          <text key={i} x={xFor(i)} y={height - 10} textAnchor="middle" fontSize={11} fill="var(--green-dark)" opacity={0.55} fontFamily="DM Mono, monospace">
            {label}
          </text>
        ) : null
      )}

      {bands.map(({ series: s, bottom, top }) => {
        const topPts = top.map((v, i) => `${xFor(i)},${yFor(v)}`).join(' ');
        const bottomPts = bottom
          .map((v, i) => `${xFor(i)},${yFor(v)}`)
          .reverse()
          .join(' ');
        return <polygon key={s.name} points={`${topPts} ${bottomPts}`} fill={s.color} opacity={0.8} />;
      })}
    </svg>
  );
}
