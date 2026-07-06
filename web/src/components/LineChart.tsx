interface Series {
  name: string;
  color: string;
  values: number[];
}

interface LineChartProps {
  labels: string[];
  series: Series[];
  height?: number;
}

const WIDTH = 800;
const PAD_LEFT = 44;
const PAD_RIGHT = 16;
const PAD_TOP = 16;
const PAD_BOTTOM = 32;

export function LineChart({ labels, series, height = 320 }: LineChartProps) {
  const plotWidth = WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotHeight = height - PAD_TOP - PAD_BOTTOM;
  const maxVal = Math.max(1, ...series.flatMap((s) => s.values));
  const n = labels.length;

  const xFor = (i: number) => PAD_LEFT + (n <= 1 ? plotWidth / 2 : (i / (n - 1)) * plotWidth);
  const yFor = (v: number) => PAD_TOP + plotHeight - (v / maxVal) * plotHeight;

  const gridLines = 4;
  const gridValues = Array.from({ length: gridLines + 1 }, (_, i) => Math.round((maxVal / gridLines) * i));

  const tickEvery = Math.max(1, Math.ceil(n / 8));

  if (n === 0) {
    return <div style={{ opacity: 0.6, fontSize: '0.88rem' }}>Not enough data to plot yet.</div>;
  }

  return (
    <svg width="100%" viewBox={`0 0 ${WIDTH} ${height}`} style={{ display: 'block', overflow: 'visible' }}>
      {gridValues.map((v, i) => {
        const y = yFor(v);
        return (
          <g key={i}>
            <line x1={PAD_LEFT} y1={y} x2={WIDTH - PAD_RIGHT} y2={y} stroke="var(--sage-light)" strokeWidth={1} opacity={0.6} />
            <text x={PAD_LEFT - 8} y={y + 4} textAnchor="end" fontSize={11} fill="var(--green-dark)" opacity={0.55} fontFamily="DM Mono, monospace">
              {v}
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

      {series.map((s, si) => {
        const points = s.values.map((v, i) => `${xFor(i)},${yFor(v)}`).join(' ');
        const areaPoints = si === 0 ? `${xFor(0)},${yFor(0)} ${points} ${xFor(n - 1)},${yFor(0)}` : null;
        return (
          <g key={s.name}>
            {areaPoints && <polygon points={areaPoints} fill={s.color} opacity={0.12} />}
            <polyline points={points} fill="none" stroke={s.color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
            {s.values.map((v, i) => (
              <circle key={i} cx={xFor(i)} cy={yFor(v)} r={3.5} fill={s.color}>
                <title>
                  {labels[i]}: {v} ({s.name})
                </title>
              </circle>
            ))}
          </g>
        );
      })}
    </svg>
  );
}
