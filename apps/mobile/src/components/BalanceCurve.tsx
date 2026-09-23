import { View } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import type { CalendarDay } from '@tiny-budget/core';
import type { Palette } from '../theme';

/**
 * The shape of the month's money, drawn like a tide chart.
 *
 * A running balance is a curve, not a list, and the thing worth seeing is
 * where it bottoms out — so the low point is the only marked coordinate and
 * the zero line is drawn whether or not the curve reaches it. Every fintech
 * kit charts a portfolio going up and to the right; this one is honest about
 * dipping, because that dip is the reason to open the app.
 */
export function BalanceCurve({
  days,
  palette,
  width,
  height = 92,
  tone = 'good',
}: {
  days: CalendarDay[];
  palette: Palette;
  width: number;
  height?: number;
  /** Matches the headline figure, so the curve and the number never disagree. */
  tone?: 'good' | 'warn' | 'bad';
}) {
  if (days.length < 2 || width <= 0) return <View style={{ height }} />;

  const values = days.map((d) => d.balance);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  const span = max - min || 1;

  const padY = 10;
  const usable = height - padY * 2;
  const x = (i: number) => (i / (days.length - 1)) * width;
  const y = (v: number) => padY + (1 - (v - min) / span) * usable;

  const line = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(2)},${y(v).toFixed(2)}`).join(' ');
  const area = `${line} L${width.toFixed(2)},${y(min).toFixed(2)} L0,${y(min).toFixed(2)} Z`;

  const lowIndex = values.indexOf(Math.min(...values));
  const zeroY = y(0);
  const dipsUnder = min < 0;
  const stroke = tone === 'bad' ? palette.aground : tone === 'warn' ? palette.shoal : palette.tide;

  return (
    <Svg width={width} height={height}>
      {/* Water below the waterline, so "under" is a place on the chart
          rather than a colour swapped in at the last moment. */}
      {dipsUnder && (
        <Rect
          x={0}
          y={zeroY}
          width={width}
          height={Math.max(height - zeroY, 0)}
          fill={palette.aground}
          opacity={0.14}
        />
      )}
      <Path d={area} fill={stroke} opacity={0.14} />
      <Path
        d={line}
        stroke={stroke}
        strokeWidth={2}
        fill="none"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <Line
        x1={0}
        y1={zeroY}
        x2={width}
        y2={zeroY}
        stroke={palette.onDeepMuted}
        strokeWidth={1}
        strokeDasharray="3 4"
        opacity={0.6}
      />
      <Circle
        cx={x(lowIndex)}
        cy={y(values[lowIndex])}
        r={4.5}
        fill={stroke}
        stroke={palette.deep}
        strokeWidth={2.5}
      />
    </Svg>
  );
}
