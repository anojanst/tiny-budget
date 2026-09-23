import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
  type CalendarDay,
} from '@tiny-budget/core';
import { useBudgetContext } from '../src/budgetContext';
import { Button, Card, Empty, SectionTitle, StatTile } from '../src/components/ui';
import { radius, space, usePalette } from '../src/theme';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const MAX_MONTHS = 60;

/**
 * The calendar, rebuilt for a phone rather than shrunk to fit one.
 *
 * On the web the month grid carries the figures in its cells. At 375px a cell
 * is barely wider than its date, so here the grid is a *map* — dots for what
 * happens, a ring for today, a red wash for a day you run out — and the agenda
 * beneath it carries the detail. Tapping a day scrolls the agenda to it.
 */
export default function CalendarScreen() {
  const { budget, today, loaded } = useBudgetContext();
  const [monthOffset, setMonthOffset] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const p = usePalette();

  const visibleMonth = useMemo(
    () => addMonths(startOfMonth(today), monthOffset),
    [today, monthOffset],
  );

  // Always projected from today, however far ahead the view is scrolled — a
  // balance is only meaningful as the running total of everything before it.
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
  const lowest = monthDays.reduce<CalendarDay | null>(
    (min, d) => (min === null || d.balance < min.balance ? d : min),
    null,
  );
  const paydays = monthDays.filter((d) => d.isPayday);
  const firstShort = days.find((d) => d.short) ?? null;
  const hasAnything =
    budget.incomes.length > 0 || budget.expenses.length > 0 || budget.oneOffs.length > 0;
  const undated = [...budget.incomes, ...budget.expenses].filter((e) => !e.nextDue).length;

  if (!loaded) {
    return (
      <View style={[styles.screen, { backgroundColor: p.bg, justifyContent: 'center' }]}>
        <Empty>Loading your budget…</Empty>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: p.bg }}
      contentContainerStyle={styles.screen}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.monthBar}>
        <Button
          label="‹"
          variant="ghost"
          disabled={monthOffset === 0}
          onPress={() => setMonthOffset((m) => Math.max(m - 1, 0))}
          style={{ paddingHorizontal: space.lg }}
        />
        <Pressable onPress={() => setMonthOffset(0)} accessibilityRole="button">
          <Text style={[styles.monthLabel, { color: p.text }]}>
            {formatMonthYear(visibleMonth)}
          </Text>
        </Pressable>
        <Button
          label="›"
          variant="ghost"
          disabled={monthOffset === MAX_MONTHS}
          onPress={() => setMonthOffset((m) => Math.min(m + 1, MAX_MONTHS))}
          style={{ paddingHorizontal: space.lg }}
        />
      </View>

      {!hasAnything && (
        <Card>
          <Text style={{ color: p.text }}>
            Nothing to draw yet. Add what comes in and what goes out on the In &amp; out tab, give
            each one a date, and it lands here.
          </Text>
        </Card>
      )}

      {hasAnything && undated > 0 && (
        <Card style={{ borderColor: p.border }}>
          <Text style={{ color: p.muted, fontSize: 13, lineHeight: 18 }}>
            {undated} {undated === 1 ? 'entry has' : 'entries have'} no date, so{' '}
            {undated === 1 ? 'it is' : 'they are'} spread evenly rather than landing on a day.
            Dating {undated === 1 ? 'it' : 'them'} turns this into an actual schedule.
          </Text>
        </Card>
      )}

      {firstShort && (
        <Card style={{ backgroundColor: p.dangerBg, borderColor: p.danger }}>
          <Text style={{ color: p.danger, fontWeight: '600' }}>
            You run out of money on {formatShortDate(firstShort.date)}
          </Text>
          <Text style={{ color: p.danger, fontSize: 13 }}>
            Down to {formatCurrency(firstShort.balance)}. Something before then needs to move.
          </Text>
        </Card>
      )}

      <View style={styles.tiles}>
        <StatTile
          label="Lowest point"
          value={lowest ? formatCurrency(lowest.balance) : '—'}
          hint={lowest ? `On ${formatShortDate(lowest.date)}` : 'Nothing projected yet'}
          tone={lowest && lowest.balance < 0 ? 'bad' : 'normal'}
        />
        <StatTile
          label="Cash today"
          value={formatCurrency(budget.currentBalance)}
          hint={`${paydays.length} payday${paydays.length === 1 ? '' : 's'} this month`}
        />
      </View>

      <Card>
        <View style={styles.weekRow}>
          {WEEKDAYS.map((d, i) => (
            <Text key={`${d}${i}`} style={[styles.weekday, { color: p.muted }]}>
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
                  isSelected && { backgroundColor: p.accentBg, borderColor: p.primary },
                  entry?.short && { backgroundColor: p.dangerBg },
                  isToday && { borderColor: p.text, borderWidth: 1.5 },
                ]}
              >
                <Text
                  style={[
                    styles.cellDate,
                    { color: inMonth ? (isPast ? p.muted : p.text) : 'transparent' },
                    isToday && { fontWeight: '800' },
                  ]}
                >
                  {date.getDate()}
                </Text>
                <View style={styles.dots}>
                  {moneyIn && !isPast && (
                    <View style={[styles.dot, { backgroundColor: p.primary }]} />
                  )}
                  {moneyOut && !isPast && (
                    <View style={[styles.dot, { backgroundColor: p.muted }]} />
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
        {selected && byKey.get(selected) ? (
          <Text style={[styles.selectedLine, { color: p.text, borderTopColor: p.border }]}>
            {formatShortDate(byKey.get(selected)!.date)} —{' '}
            {formatCurrency(byKey.get(selected)!.balance)} left
          </Text>
        ) : null}
      </Card>

      <View>
        <SectionTitle
          title="What's coming"
          hint="Every movement this month, and what it leaves you holding."
        />
        <Card style={{ gap: 0 }}>
          {events.length === 0 ? (
            <Empty>Nothing dated in {formatMonthYear(visibleMonth)}.</Empty>
          ) : (
            events.map((entry, index) => (
              <View
                key={entry.key}
                style={[
                  styles.event,
                  index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: p.border },
                ]}
              >
                <Text style={[styles.eventDate, { color: p.muted }]}>
                  {entry.date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                </Text>
                <View style={{ flex: 1, gap: 2 }}>
                  {entry.paydays.map((pay) => (
                    <Text key={pay.id} style={[styles.in, { color: p.primary }]}>
                      {pay.name} +{formatCurrency(pay.amount)}
                    </Text>
                  ))}
                  {entry.credits.map((credit) => (
                    <Text key={credit.id} style={[styles.in, { color: p.primary }]}>
                      {credit.name} +{formatCurrency(credit.amount)}
                    </Text>
                  ))}
                  {entry.bills.map((bill) => (
                    <Text key={bill.id} style={[styles.out, { color: p.muted }]}>
                      {bill.name} −{formatCurrency(bill.amount)}
                    </Text>
                  ))}
                </View>
                <Text
                  style={[
                    styles.balance,
                    { color: entry.short ? p.danger : p.text },
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
  monthBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  monthLabel: { fontSize: 20, fontWeight: '700', letterSpacing: -0.3 },
  tiles: { flexDirection: 'row', gap: space.md },
  weekRow: { flexDirection: 'row', marginBottom: space.xs },
  weekday: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'transparent',
    gap: 3,
  },
  cellDate: { fontSize: 13, fontVariant: ['tabular-nums'] },
  dots: { flexDirection: 'row', gap: 3, height: 5 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  selectedLine: {
    marginTop: space.sm,
    paddingTop: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  event: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md, paddingVertical: 10 },
  eventDate: { width: 52, fontSize: 13, fontVariant: ['tabular-nums'] },
  in: { fontSize: 14, fontWeight: '600' },
  out: { fontSize: 14 },
  balance: { fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
