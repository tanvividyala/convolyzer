import type { PatternFlag } from '../types';
import { PATTERN_COLORS, PATTERN_LABELS } from '../lib/patterns';

interface PatternTimelineProps {
  flags: PatternFlag[];
  totalTurns: number;
  activeTurn: number | null;
  onSelect: (turnIndex: number) => void;
}

/** Horizontal strip with one colored marker per flagged turn, positioned by turn index. */
export function PatternTimeline({ flags, totalTurns, activeTurn, onSelect }: PatternTimelineProps) {
  const width = 800;
  const height = 60;
  const pad = 8;
  const track = width - pad * 2;
  const xFor = (turnIndex: number) => pad + (totalTurns <= 1 ? track / 2 : (turnIndex / (totalTurns - 1)) * track);

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
      <line x1={pad} y1={height / 2} x2={width - pad} y2={height / 2} stroke="var(--sage-light)" strokeWidth={2} />
      {flags.map((f, i) => {
        const x = xFor(f.turnIndex);
        const active = activeTurn === f.turnIndex;
        return (
          <g key={i} style={{ cursor: 'pointer' }} onClick={() => onSelect(f.turnIndex)}>
            <circle cx={x} cy={height / 2} r={active ? 8 : 5} fill={PATTERN_COLORS[f.pattern]} opacity={active ? 1 : 0.8} stroke={active ? 'var(--green-dark)' : 'none'} strokeWidth={1.5}>
              <title>
                {PATTERN_LABELS[f.pattern]} — {f.author}: {f.excerpt}
              </title>
            </circle>
          </g>
        );
      })}
    </svg>
  );
}
