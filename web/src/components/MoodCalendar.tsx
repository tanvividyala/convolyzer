import { useMemo } from 'react';
import type { DailyAggregate } from '../types';
import { MOOD_COLORS, MOOD_LABELS, sentimentToBucket, type MoodBucket } from '../lib/sentimentAgg';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const LEGEND_ORDER: MoodBucket[] = ['very-pos', 'pos', 'neutral', 'neg', 'very-neg', 'no-data'];

interface MoodCalendarProps {
  year: number;
  daily: DailyAggregate[];
}

/**
 * Bullet-journal style mood grid: 12 month columns x 31 day rows. Days with no
 * messages render as "no data" cells and are never interpolated.
 */
export function MoodCalendar({ year, daily }: MoodCalendarProps) {
  // month (0-11) + day (1-31) -> avg sentiment for the selected year
  const lookup = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of daily) {
      if (d.date.getFullYear() !== year) continue;
      map.set(`${d.date.getMonth()}-${d.date.getDate()}`, d.avgSentiment);
    }
    return map;
  }, [daily, year]);

  const cell = 22;
  const gap = 3;
  const labelTop = 22;
  const labelLeft = 26;
  const width = labelLeft + 12 * (cell + gap);
  const height = labelTop + 31 * (cell + gap);

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', minWidth: width }}>
        {MONTHS.map((m, mi) => (
          <text
            key={m}
            x={labelLeft + mi * (cell + gap) + cell / 2}
            y={14}
            textAnchor="middle"
            fontSize={11}
            fill="var(--green-dark)"
            opacity={0.6}
            fontFamily="DM Mono, monospace"
          >
            {m}
          </text>
        ))}

        {Array.from({ length: 31 }, (_, di) => {
          const day = di + 1;
          const y = labelTop + di * (cell + gap);
          return (
            <g key={day}>
              {day % 5 === 0 && (
                <text x={labelLeft - 8} y={y + cell / 2 + 4} textAnchor="end" fontSize={9} fill="var(--green-dark)" opacity={0.5} fontFamily="DM Mono, monospace">
                  {day}
                </text>
              )}
              {MONTHS.map((_, mi) => {
                const val = lookup.get(`${mi}-${day}`);
                const bucket = sentimentToBucket(val);
                const x = labelLeft + mi * (cell + gap);
                const title =
                  val == null
                    ? `${MONTHS[mi]} ${day}: no messages`
                    : `${MONTHS[mi]} ${day}: ${MOOD_LABELS[bucket]} (${val.toFixed(2)})`;
                return (
                  <rect key={mi} x={x} y={y} width={cell} height={cell} rx={4} fill={MOOD_COLORS[bucket]} opacity={bucket === 'no-data' ? 0.4 : 1}>
                    <title>{title}</title>
                  </rect>
                );
              })}
            </g>
          );
        })}
      </svg>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
        {LEGEND_ORDER.map((b) => (
          <div key={b} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', opacity: 0.8 }}>
            <span style={{ width: 12, height: 12, borderRadius: 3, background: MOOD_COLORS[b], opacity: b === 'no-data' ? 0.4 : 1 }} />
            {MOOD_LABELS[b]}
          </div>
        ))}
      </div>
    </div>
  );
}
