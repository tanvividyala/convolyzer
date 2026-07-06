interface Series {
  name: string;
  color: string;
  values: (number | null)[];
}

interface SentimentChartProps {
  labels: string[];
  series: Series[];
  height?: number;
  /** [min, max] value domain. Defaults to sentiment's [-1, 1]. */
  domain?: [number, number];
  /** Gridline/tick values, high to low. Defaults to sentiment ticks. */
  ticks?: number[];
}

const WIDTH = 800;
const PAD_LEFT = 44;
const PAD_RIGHT = 16;
const PAD_TOP = 16;
const PAD_BOTTOM = 32;

/** Gapped line chart over a fixed value domain (null values render as breaks). */
export function SentimentChart({ labels, series, height = 320, domain = [-1, 1], ticks = [1, 0.5, 0, -0.5, -1] }: SentimentChartProps) {
  const plotWidth = WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotHeight = height - PAD_TOP - PAD_BOTTOM;
  const n = labels.length;
  const [lo, hi] = domain;

  const xFor = (i: number) => PAD_LEFT + (n <= 1 ? plotWidth / 2 : (i / (n - 1)) * plotWidth);
  const yFor = (v: number) => PAD_TOP + plotHeight * (1 - (v - lo) / (hi - lo));

  const tickEvery = Math.max(1, Math.ceil(n / 8));

  if (n === 0) {
    return <div style={{ opacity: 0.6, fontSize: '0.88rem' }}>Not enough data to plot yet.</div>;
  }

  return (
    <svg width="100%" viewBox={`0 0 ${WIDTH} ${height}`} style={{ display: 'block', overflow: 'visible' }}>
      {ticks.map((v) => {
        const y = yFor(v);
        const isZero = v === 0;
        return (
          <g key={v}>
            <line
              x1={PAD_LEFT}
              y1={y}
              x2={WIDTH - PAD_RIGHT}
              y2={y}
              stroke={isZero ? 'var(--sage)' : 'var(--sage-light)'}
              strokeWidth={isZero ? 1.5 : 1}
              strokeDasharray={isZero ? '4 3' : undefined}
              opacity={0.6}
            />
            <text x={PAD_LEFT - 8} y={y + 4} textAnchor="end" fontSize={11} fill="var(--green-dark)" opacity={0.55} fontFamily="DM Mono, monospace">
              {v.toFixed(1)}
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

      {series.map((s) => {
        // Break the polyline into contiguous non-null runs so gaps render as gaps.
        const runs: string[][] = [];
        let current: string[] = [];
        s.values.forEach((v, i) => {
          if (v == null) {
            if (current.length) runs.push(current);
            current = [];
          } else {
            current.push(`${xFor(i)},${yFor(v)}`);
          }
        });
        if (current.length) runs.push(current);

        return (
          <g key={s.name}>
            {runs.map((pts, ri) => (
              <polyline key={ri} points={pts.join(' ')} fill="none" stroke={s.color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
            ))}
            {s.values.map((v, i) =>
              v == null ? null : (
                <circle key={i} cx={xFor(i)} cy={yFor(v)} r={3.5} fill={s.color}>
                  <title>
                    {labels[i]}: {v.toFixed(2)} ({s.name})
                  </title>
                </circle>
              )
            )}
          </g>
        );
      })}
    </svg>
  );
}
