const COLORS = ['#f1a97a', '#91ad94', '#5b8fc9', '#d85455', '#c8d6c9', '#2f3a26'];

interface DonutChartProps {
  data: { label: string; value: number }[];
  size?: number;
}

export function DonutChart({ data, size = 220 }: DonutChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const radius = size / 2;
  const stroke = radius * 0.36;
  const innerRadius = radius - stroke / 2;
  const circumference = 2 * Math.PI * innerRadius;

  let offset = 0;
  const segments = data.map((d, i) => {
    const fraction = total > 0 ? d.value / total : 0;
    const dash = fraction * circumference;
    const seg = { ...d, color: COLORS[i % COLORS.length], dash, offset };
    offset += dash;
    return seg;
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={radius} cy={radius} r={innerRadius} fill="none" stroke="var(--cream)" strokeWidth={stroke} />
        {segments.map((seg, i) => (
          <circle
            key={i}
            cx={radius}
            cy={radius}
            r={innerRadius}
            fill="none"
            stroke={seg.color}
            strokeWidth={stroke}
            strokeDasharray={`${seg.dash} ${circumference - seg.dash}`}
            strokeDashoffset={-seg.offset}
            transform={`rotate(-90 ${radius} ${radius})`}
            strokeLinecap="butt"
          />
        ))}
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {segments.map((seg, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: seg.color, flexShrink: 0 }} />
            <span style={{ fontWeight: 600 }}>{seg.label}</span>
            <span style={{ opacity: 0.6 }}>
              {seg.value} ({total > 0 ? Math.round((seg.value / total) * 100) : 0}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
