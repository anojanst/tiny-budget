import { StyleSheet, Text, View } from 'react-native';
import { formatCurrency, type CalendarDay } from '@tiny-budget/core';
import { space, type as t, usePalette } from '../theme';

/**
 * What the month takes, against what it brings.
 *
 * The chart this replaced drew the balance day by day, which the calendar
 * grid underneath already says — and says better, because there a shortfall
 * has a date you can point at. The question the calendar *can't* answer is
 * whether the month covers itself at all, so that is what this does: one
 * track, filled by outgoings against income, and a sentence naming the margin.
 *
 * A single bar rather than a chart is deliberate. There is one fact here and
 * it wants one shape.
 */
export function MonthFlow({ days }: { days: CalendarDay[] }) {
  const p = usePalette();
  const moneyIn = days.reduce((total, day) => total + day.incoming, 0);
  const moneyOut = days.reduce((total, day) => total + day.outgoing, 0);
  const net = moneyIn - moneyOut;

  // Against income where there is some, against outgoings otherwise — so a
  // month with bills and no pay reads as completely full rather than empty.
  const denominator = Math.max(moneyIn, moneyOut);
  const filled = denominator > 0 ? Math.min(moneyOut / denominator, 1) : 0;
  const over = moneyOut > moneyIn;
  const fill = over ? p.rose : moneyOut > moneyIn * 0.9 ? p.peach : p.mint;

  return (
    <View style={styles.wrap}>
      <View style={styles.figures}>
        <View style={{ flex: 1, gap: 1 }}>
          <Text style={[t.small, { color: p.muted }]}>In</Text>
          <Text style={[t.title, { color: p.mint, fontVariant: ['tabular-nums'] }]} numberOfLines={1}>
            {formatCurrency(moneyIn)}
          </Text>
        </View>
        <View style={{ flex: 1, gap: 1, alignItems: 'flex-end' }}>
          <Text style={[t.small, { color: p.muted }]}>Out</Text>
          <Text style={[t.title, { color: p.text, fontVariant: ['tabular-nums'] }]} numberOfLines={1}>
            {formatCurrency(moneyOut)}
          </Text>
        </View>
      </View>

      <View
        accessibilityRole="progressbar"
        accessibilityLabel="Outgoings against income this month"
        accessibilityValue={{ now: Math.round(filled * 100), min: 0, max: 100 }}
        style={[styles.track, { backgroundColor: p.slateWash }]}
      >
        <View style={[styles.fill, { width: `${filled * 100}%`, backgroundColor: fill }]} />
      </View>

      <Text style={[t.small, { color: p.muted, lineHeight: 17 }]}>
        {denominator === 0
          ? 'Nothing moves this month.'
          : over
            ? `${formatCurrency(-net)} more goes out than comes in.`
            : `${formatCurrency(net)} spare — bills take ${Math.round(filled * 100)}% of what arrives.`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm },
  figures: { flexDirection: 'row', alignItems: 'flex-end', gap: space.md },
  track: { height: 10, borderRadius: 5, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 5 },
});
