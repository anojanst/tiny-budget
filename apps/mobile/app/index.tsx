import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  addMonths,
  buildCashflowDays,
  endOfMonth,
  formatCurrency,
  formatMonthYear,
  formatShortDate,
  isSameDay,
  startOfMonth,
  toDateInputValue,
  weeksBetween,
  type CalendarDay,
} from '@tiny-budget/core';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBudgetContext } from '../src/budgetContext';
import { BalanceCurve } from '../src/components/BalanceCurve';
import { Card, Empty, QuickAction, SectionTitle } from '../src/components/ui';
import { radius, space, type as t, usePalette } from '../src/theme';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const MAX_MONTHS = 60;

export default function CalendarScreen() {
  const { budget, today, loaded } = useBudgetContext();
  const [monthOffset, setMonthOffset] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const p = usePalette();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const visibleMonth = useMemo(
    () => addMonths(startOfMonth(today), monthOffset),
    [today, monthOffset],
  );

  const days = useMemo(
    () =>
      buildCashflowDays({
        from: today,
        through: endOfMonth(addMonths(startOfMonth(today), Math.max(monthOffset, 0))),
        startingBalance: budget.currentBalance,
        incomes: budget.incomes,
        expenses: budget.expenses,
        oneOffs: budget.oneOffs,
      }),
    [today, monthOffset, budget],
  );

  const byKey = useMemo(() => new Map(days.map((d) => [d.key, d])), [days]);

  const cells = useMemo(() => {
    const first = startOfMonth(visibleMonth);
    const last = endOfMonth(visibleMonth);
    const lead = (first.getDay() + 6) % 7; // getDay is Sunday-first
    const out: Date[] = [];
    for (let i = 0; i < lead; i++) {
      out.push(new Date(first.getFullYear(), first.getMonth(), 1 - (lead - i)));
    }
    for (let d = 1; d <= last.getDate(); d++) {
      out.push(new Date(first.getFullYear(), first.getMonth(), d));
    }
    while (out.length % 7 !== 0) {
      const tail = out[out.length - 1];
      out.push(new Date(tail.getFullYear(), tail.getMonth(), tail.getDate() + 1));
    }
    return out;
  }, [visibleMonth]);

  const monthDays = days.filter(
    (d) =>
      d.date.getMonth() === visibleMonth.getMonth() &&
      d.date.getFullYear() === visibleMonth.getFullYear(),
  );
  const events = monthDays.filter(
    (d) =>
      (d.isPayday || d.bills.length > 0 || d.credits.length > 0) &&
      d.date.getTime() >= today.getTime(),
  );
  const low = monthDays.reduce<CalendarDay | null>(
    (min, d) => (min === null || d.balance < min.balance ? d : min),
    null,
  );
  const hasAnything =
    budget.incomes.length > 0 || budget.expenses.length > 0 || budget.oneOffs.length > 0;
  const undated = [...budget.incomes, ...budget.expenses].filter((e) => !e.nextDue).length;

  // Three states, one scale: under, shallow, clear. "Shallow" is a week of
  // outgoings — a buffer thinner than that is worth naming before it's a
  // shortfall, which is the warning an all-or-nothing red can never give.
  const weeklyOut = budget.expenses.reduce(
    (sum, e) => sum + e.amount / (e.frequency === 'weekly' ? 1 : 4.333),
    0,
  );
  const tone: 'bad' | 'warn' | 'good' =
    !low || !hasAnything ? 'good' : low.balance < 0 ? 'bad' : low.balance < weeklyOut ? 'warn' : 'good';
  const toneColor = tone === 'bad' ? p.rose : tone === 'warn' ? p.peach : p.mint;

  const daysAway = low ? Math.max(Math.round(weeksBetween(today, low.date) * 7), 0) : 0;
  const heroWidth = Math.max(width - space.lg * 2 - space.lg * 2, 120);

  if (!loaded) {
    return (
      <View style={[styles.screen, { backgroundColor: p.page, justifyContent: 'center', flex: 1 }]}>
        <Empty>Loading your budget…</Empty>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: p.page }}
      contentContainerStyle={styles.screen}
      keyboardShouldPersistTaps="handled"
    >
      {/* A brand band with the figure card lifted onto it: colour at the top
          of the screen for warmth, and the number itself on white where it
          stays legible in all three states. */}
      <View style={styles.heroWrap}>
        <LinearGradient
          colors={[p.brand, p.brandDeep]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.band, { paddingTop: insets.top + space.md }]}
        >
          <View style={styles.bandRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Previous month"
              disabled={monthOffset === 0}
              onPress={() => setMonthOffset((m) => Math.max(m - 1, 0))}
              style={styles.arrow}
            >
              <Text style={{ color: monthOffset === 0 ? p.onBrandMuted : p.onBrand, fontSize: 22 }}>
                ‹
              </Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => setMonthOffset(0)}>
              <Text style={[t.title, { color: p.onBrand }]}>{formatMonthYear(visibleMonth)}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Next month"
              disabled={monthOffset === MAX_MONTHS}
              onPress={() => setMonthOffset((m) => Math.min(m + 1, MAX_MONTHS))}
              style={styles.arrow}
            >
              <Text style={{ color: p.onBrand, fontSize: 22 }}>›</Text>
            </Pressable>
          </View>
        </LinearGradient>

        <View style={[styles.heroCard, { backgroundColor: p.surface, borderColor: p.line }]}>
          <Text style={[t.small, { color: p.muted }]}>
            {hasAnything ? 'Lowest this month' : 'Nothing projected yet'}
          </Text>
          <Text
            style={[t.hero, { color: hasAnything ? toneColor : p.muted, fontVariant: ['tabular-nums'] }]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {low && hasAnything ? formatCurrency(low.balance) : '—'}
          </Text>
          {low && hasAnything ? (
            <View style={styles.heroNote}>
              <Text style={[t.small, { color: p.muted }]}>
                {formatShortDate(low.date)}
                {daysAway === 0 ? ' · today' : daysAway === 1 ? ' · tomorrow' : ` · in ${daysAway} days`}
              </Text>
              {tone !== 'good' && (
                <View
                  style={[
                    styles.pill,
                    { backgroundColor: tone === 'bad' ? p.roseWash : p.peachWash },
                  ]}
                >
                  <Text style={[t.small, { color: toneColor, fontWeight: '600' }]}>
                    {tone === 'bad' ? 'You run out' : "Under a week's bills"}
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <Text style={[t.small, { color: p.muted }]}>
              Add what comes in and goes out, and this fills in.
            </Text>
          )}

          <View style={{ marginTop: space.md }}>
            <BalanceCurve days={days} palette={p} width={heroWidth} tone={tone} />
          </View>
          <View style={styles.heroFoot}>
            <Text style={[t.small, { color: p.muted }]}>
              {formatCurrency(budget.currentBalance)} today
            </Text>
            <Text style={[t.small, { color: p.muted }]}>
              {formatCurrency(days[days.length - 1]?.balance ?? 0)} by month end
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.quickRow}>
        <QuickAction icon="cash-plus" label="Income" tint="mint" onPress={() => router.push('/money')} />
        <QuickAction icon="cash-minus" label="Payment" tint="peach" onPress={() => router.push('/money')} />
        <QuickAction
          icon="calendar-plus"
          label="One-off"
          tint="brand"
          onPress={() => router.push('/money')}
        />
        <QuickAction
          icon="format-list-bulleted"
          label="All money"
          tint="slate"
          onPress={() => router.push('/money')}
        />
      </View>

      {hasAnything && undated > 0 && (
        <Card style={{ backgroundColor: p.peachWash, borderColor: p.peach }}>
          <Text style={[t.small, { color: p.peach, lineHeight: 18 }]}>
            {undated} {undated === 1 ? 'entry has' : 'entries have'} no date, so{' '}
            {undated === 1 ? 'it is' : 'they are'} spread evenly instead of landing on a day. Dating{' '}
            {undated === 1 ? 'it' : 'them'} turns this into an actual schedule.
          </Text>
        </Card>
      )}

      <Card style={{ gap: space.sm }}>
        <View style={styles.weekRow}>
          {WEEKDAYS.map((d, i) => (
            <Text key={`${d}${i}`} style={[t.small, styles.weekday, { color: p.muted }]}>
              {d}
            </Text>
          ))}
        </View>
        <View style={styles.grid}>
          {cells.map((date) => {
            const key = toDateInputValue(date);
            const entry = byKey.get(key);
            const inMonth = date.getMonth() === visibleMonth.getMonth();
            const isToday = isSameDay(date, today);
            const isPast = date.getTime() < today.getTime();
            const moneyIn = !!entry && (entry.isPayday || entry.credits.length > 0);
            const moneyOut = !!entry && entry.bills.length > 0;
            const isSelected = selected === key;
            return (
              <Pressable
                key={key}
                accessibilityRole="button"
                accessibilityLabel={`${formatShortDate(date)}${
                  entry ? `, balance ${formatCurrency(entry.balance)}` : ''
                }`}
                onPress={() => setSelected(isSelected ? null : key)}
                style={[
                  styles.cell,
                  entry?.short && { backgroundColor: p.roseWash },
                  isSelected && { backgroundColor: p.brandWash, borderColor: p.mint },
                  isToday && { borderColor: p.text },
                ]}
              >
                <Text
                  style={[
                    t.small,
                    styles.cellDate,
                    { color: inMonth ? (isPast ? p.muted : p.text) : 'transparent' },
                    isToday && { fontWeight: '700' },
                  ]}
                >
                  {date.getDate()}
                </Text>
                <View style={styles.dots}>
                  {moneyIn && !isPast && <View style={[styles.dot, { backgroundColor: p.mint }]} />}
                  {moneyOut && !isPast && <View style={[styles.dot, { backgroundColor: p.muted }]} />}
                </View>
              </Pressable>
            );
          })}
        </View>
        {selected && byKey.get(selected) ? (
          <Text style={[t.label, styles.selectedLine, { color: p.text, borderTopColor: p.line }]}>
            {formatShortDate(byKey.get(selected)!.date)} — {formatCurrency(byKey.get(selected)!.balance)} left
          </Text>
        ) : null}
      </Card>

      <View>
        <SectionTitle title="What's coming" hint="Every movement, and what it leaves you holding." />
        <Card style={{ gap: 0, paddingVertical: space.xs }}>
          {events.length === 0 ? (
            <Empty>Nothing dated in {formatMonthYear(visibleMonth)}.</Empty>
          ) : (
            events.map((entry, index) => (
              <View
                key={entry.key}
                style={[
                  styles.event,
                  index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: p.line },
                ]}
              >
                <View style={styles.eventDate}>
                  <Text style={[t.small, { color: p.muted }]}>
                    {entry.date.toLocaleDateString(undefined, { month: 'short' })}
                  </Text>
                  <Text style={[t.label, { color: p.text, fontWeight: '600' }]}>
                    {entry.date.getDate()}
                  </Text>
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  {[...entry.paydays, ...entry.credits].map((item) => (
                    <Text key={item.id} style={[t.body, { color: p.mint, fontWeight: '600' }]}>
                      {item.name} +{formatCurrency(item.amount)}
                    </Text>
                  ))}
                  {entry.bills.map((bill) => (
                    <Text key={bill.id} style={[t.body, { color: p.muted }]}>
                      {bill.name} −{formatCurrency(bill.amount)}
                    </Text>
                  ))}
                </View>
                <Text
                  style={[
                    t.label,
                    {
                      color: entry.short ? p.rose : p.text,
                      fontWeight: '700',
                      fontVariant: ['tabular-nums'],
                    },
                  ]}
                >
                  {formatCurrency(entry.balance)}
                </Text>
              </View>
            ))
          )}
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { padding: space.lg, gap: space.lg, paddingBottom: space.xl * 2 },
  heroWrap: { marginTop: -space.lg, marginHorizontal: -space.lg },
  band: { paddingTop: space.md, paddingBottom: space.xl + space.lg, paddingHorizontal: space.lg },
  bandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  arrow: { paddingHorizontal: space.sm, paddingVertical: 2 },
  heroCard: {
    marginTop: -(space.xl + space.sm),
    marginHorizontal: space.lg,
    borderRadius: radius.hero,
    borderWidth: StyleSheet.hairlineWidth,
    padding: space.lg,
    gap: 2,
  },
  heroNote: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: space.sm },
  pill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  heroFoot: { flexDirection: 'row', justifyContent: 'space-between', marginTop: space.xs },
  quickRow: { flexDirection: 'row', gap: space.sm },
  weekRow: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center', fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: 'transparent',
    gap: 3,
  },
  cellDate: { fontVariant: ['tabular-nums'] },
  dots: { flexDirection: 'row', gap: 3, height: 5 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  selectedLine: {
    marginTop: space.xs,
    paddingTop: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    textAlign: 'center',
    fontWeight: '600',
  },
  event: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 11 },
  eventDate: { width: 34, alignItems: 'center' },
});
