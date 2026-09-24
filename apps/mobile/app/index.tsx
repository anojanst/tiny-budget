import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  addMonths,
  buildCashflowDays,
  endOfMonth,
  formatCurrency,
  formatMonthYear,
  formatDayMonth,
  formatShortDate,
  isSameDay,
  startOfMonth,
  toDateInputValue,
} from '@money-ahead/core';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBudgetContext } from '../src/budgetContext';
import { summariseMonth } from '../src/heroSummary';
import { MonthFlow } from '../src/components/MonthFlow';
import { Card, Empty, MovementRow, QuickAction, SectionTitle } from '../src/components/ui';
import { movementIcon } from '../src/components/movementIcon';
import { radius, shadow, space, type as t, usePalette } from '../src/theme';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const MAX_MONTHS = 60;

export default function CalendarScreen() {
  const { budget, budgets, activeBudgetId, today, loaded } = useBudgetContext();
  const [monthOffset, setMonthOffset] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const p = usePalette();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const budgetName =
    budgets.find((entry) => entry.id === activeBudgetId)?.name ?? 'Budget';

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
  /**
   * One entry per movement rather than per day. A day that pays two wages and
   * takes three bills is five things that happened, and a list reads better as
   * five rows than as one dense cell.
   */
  const movements = events.flatMap((day) => {
    const when = day.date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
    const inbound = [...day.paydays, ...day.credits].map((item) => ({
      key: `${day.key}-${item.id}`,
      name: item.name,
      amount: item.amount,
      direction: 'in' as const,
      when,
      balance: day.balance,
      short: day.short,
    }));
    const outbound = day.bills.map((item) => ({
      key: `${day.key}-${item.id}`,
      name: item.name,
      amount: item.amount,
      direction: 'out' as const,
      when,
      balance: day.balance,
      short: day.short,
    }));
    return [...inbound, ...outbound];
  });

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
  const hero = hasAnything ? summariseMonth(monthDays, weeklyOut, today) : null;
  // The supporting line is muted when there is nothing to flag: a healthy
  // month should not be coloured in, or colour stops meaning anything.
  const noteColor = hero?.tone === 'bad' ? p.rose : hero?.tone === 'warn' ? p.peach : p.muted;

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
          <Text style={[t.small, { color: p.onBrandMuted, marginBottom: space.md }]}>
            {budgetName}
          </Text>
          <View style={styles.bandRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Previous month"
              disabled={monthOffset === 0}
              onPress={() => setMonthOffset((m) => Math.max(m - 1, 0))}
              style={[styles.navDisc, { backgroundColor: 'rgba(255,255,255,0.16)' }]}
            >
              <Text style={{ color: monthOffset === 0 ? p.onBrandMuted : p.onBrand, fontSize: 20 }}>
                ‹
              </Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => setMonthOffset(0)}>
              <Text style={[t.section, { color: p.onBrand }]}>{formatMonthYear(visibleMonth)}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Next month"
              disabled={monthOffset === MAX_MONTHS}
              onPress={() => setMonthOffset((m) => Math.min(m + 1, MAX_MONTHS))}
              style={[styles.navDisc, { backgroundColor: 'rgba(255,255,255,0.16)' }]}
            >
              <Text style={{ color: p.onBrand, fontSize: 20 }}>›</Text>
            </Pressable>
          </View>
        </LinearGradient>

        <View style={[styles.heroCard, shadow.hero, { backgroundColor: p.surface }]}>
          <Text style={[t.small, { color: p.muted }]}>
            {hero ? hero.label : 'Nothing projected yet'}
          </Text>
          <Text
            style={[
              t.hero,
              {
                color: !hero ? p.muted : hero.short ? p.rose : p.text,
                fontVariant: ['tabular-nums'],
              },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {hero ? formatCurrency(hero.amount) : '—'}
          </Text>
          {hero ? (
            <View style={styles.heroNote}>
              <Text style={[t.small, { color: noteColor, lineHeight: 18 }]}>{hero.note}</Text>
            </View>
          ) : (
            <Text style={[t.small, { color: p.muted }]}>
              Add what comes in and goes out, and this fills in.
            </Text>
          )}

          <View style={[styles.heroSplit, { borderTopColor: p.line }]}>
            {/* The projection has to run from today, because a balance is only
                meaningful as the running total of everything before it — but
                the summary covers the month you are looking at, not the whole
                run up to it. */}
            <MonthFlow days={monthDays} />
          </View>
          <View style={[styles.heroFoot, { borderTopColor: p.line }]}>
            <Text style={[t.small, { color: p.muted }]}>
              Starting from {formatCurrency(budget.currentBalance)} today
            </Text>
          </View>
        </View>
      </View>

      {/* Three rather than four now that income and payments have tabs of
          their own: a shortcut to the page you are one tap from anyway is
          just a second row of navigation. */}
      <Card style={styles.quickCard}>
        <QuickAction
          icon="cash-plus"
          label="Income"
          tint="mint"
          onPress={() => router.push('/income')}
        />
        <QuickAction
          icon="cash-minus"
          label="Payment"
          tint="peach"
          onPress={() => router.push('/payments')}
        />
        <QuickAction
          icon="calendar-plus"
          label="One-off"
          tint="brand"
          onPress={() => router.push('/payments')}
        />
      </Card>

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
            {formatDayMonth(byKey.get(selected)!.date)} — {formatCurrency(byKey.get(selected)!.balance)} left
          </Text>
        ) : null}
      </Card>

      <View>
        <SectionTitle
          title="What's coming"
          hint="Each movement, and what it leaves you holding."
          action={{ label: 'Payments', onPress: () => router.push('/payments') }}
        />
        <Card style={{ gap: 0, paddingVertical: space.xs }}>
          {movements.length === 0 ? (
            <Empty>Nothing dated in {formatMonthYear(visibleMonth)}.</Empty>
          ) : (
            movements.map((m, index) => (
              <MovementRow
                key={m.key}
                first={index === 0}
                icon={movementIcon(m.name, m.direction)}
                tint={m.direction === 'in' ? 'mint' : m.short ? 'rose' : 'slate'}
                title={m.name}
                subtitle={`${m.when} · ${formatCurrency(m.balance)} left`}
                amount={`${m.direction === 'in' ? '+' : '−'}${formatCurrency(m.amount)}`}
                amountTone={m.direction === 'in' ? 'in' : m.short ? 'bad' : 'normal'}
              />
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
  // A substantial field of colour, not a strip: the card has to have
  // something to float on, or the overlap reads as a misaligned header.
  // A substantial field of colour, not a strip: the card has to have
  // something to float on, and blue has to breathe above it or the overlap
  // reads as a misaligned header rather than a deliberate layer.
  band: { paddingTop: space.md, paddingBottom: space.xl * 4, paddingHorizontal: space.lg },
  bandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navDisc: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  heroCard: {
    marginTop: -(space.xl * 2),
    marginHorizontal: space.lg,
    borderRadius: radius.hero,
    padding: space.lg,
    gap: 2,
  },
  heroNote: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: space.sm },
  pill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  heroSplit: {
    marginTop: space.md,
    paddingTop: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  heroFoot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: space.md,
    paddingTop: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  quickCard: { flexDirection: 'row', gap: space.sm, paddingVertical: space.lg },
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
