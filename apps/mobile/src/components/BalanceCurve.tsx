import { View } from 'react-native';
import Svg, { Line, Rect } from 'react-native-svg';
import type { CalendarDay } from '@tiny-budget/core';
import type { Palette } from '../theme';

/**
 * One bar per day, measured from the zero line.
 *
 * A running balance only moves on the days something happens, so a smoothed
 * line would invent a gentle slope across flat stretches and imply amounts the
 * balance never held. Bars say what is true: this is what you have at the end
 * of each day. Days in the red hang below the line rather than changing
 * colour alone, so the shortfall has a shape as well as a hue, and the day you
 * are lowest is the one bar drawn at full strength.
 */
export function BalanceCurve({
  days,
  palette,
  width,
  height = 96,
  tone = 'good',
}: {
  days: CalendarDay[];
  palette: Palette;
  width: number;
  height?: number;
  /** Matches the headline figure, so the chart and the number never disagree. */
  tone?: 'good' | 'warn' | 'bad';
}) {
  if (days.length === 0 || width <= 0) return <View style={{ height }} />;

  const values = days.map((d) => d.balance);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  const span = max - min || 1;

  const padY = 8;
  const usable = height - padY * 2;
  const zeroY = padY + (max / span) * usable;

  const slot = width / days.length;
  // Proportional to the slot, not a fixed width: late in a month only a week
  // remains, and fixed-width bars would leave the chart looking like a few
  // stray marks rather than a series.
  const barW = Math.max(Math.min(slot * 0.66, 22), 2);
  const radius = Math.min(barW / 2, 4);

  const accent = tone === 'bad' ? palette.rose : tone === 'warn' ? palette.peach : palette.mint;
  const lowIndex = values.indexOf(Math.min(...values));

  return (
    <Svg width={width} height={height}>
      {values.map((v, i) => {
        const h = Math.max((Math.abs(v) / span) * usable, 1.5);
        const negative = v < 0;
        const y = negative ? zeroY : zeroY - h;
        const isLow = i === lowIndex;
        return (
          <Rect
            key={days[i].key}
            x={i * slot + (slot - barW) / 2}
            y={y}
            width={barW}
            height={h}
            rx={radius}
            fill={negative ? palette.rose : accent}
            // The low day is the point of the chart, so everything else steps
            // back rather than the low day shouting.
            opacity={isLow ? 1 : negative ? 0.55 : 0.4}
          />
        );
      })}
      <Line
        x1={0}
        y1={zeroY}
        x2={width}
        y2={zeroY}
        stroke={palette.muted}
        strokeWidth={1}
        strokeDasharray="3 4"
        opacity={0.45}
      />
    </Svg>
  );
}
