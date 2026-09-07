import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PageHeader } from '@/components/shell/PageHeader';
import { StatCard } from '@/components/StatCard';
import { OneOffSection } from '@/components/OneOffSection';
import { buildCashflowDays } from '@/lib/calendar';
import { formatCurrency } from '@/lib/format';
import {
  addMonths,
  endOfMonth,
  formatMonthYear,
  formatShortDate,
  isSameDay,
  startOfMonth,
  toDateInputValue,
} from '@/lib/dates';
import { cn } from '@/lib/utils';
import type { Route } from '@/hooks/useHashRoute';
import type { useBudget } from '@/hooks/useBudget';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface CalendarPageProps {
  budget: ReturnType<typeof useBudget>;
  onNavigate: (route: Route) => void;
}

export function CalendarPage({ budget, onNavigate }: CalendarPageProps) {
  const { budget: data, today, addOneOff, updateOneOff, removeOneOff } = budget;
  const [monthOffset, setMonthOffset] = useState(0);

  const visibleMonth = useMemo(() => addMonths(startOfMonth(today), monthOffset), [today, monthOffset]);

  // Always projected from today, however far ahead the view is scrolled — a
  // balance is only meaningful as the running total of everything before it.
  const days = useMemo(
    () =>
      buildCashflowDays({
        from: today,
        through: endOfMonth(addMonths(startOfMonth(today), Math.max(monthOffset, 0))),
        startingBalance: data.currentBalance,
        incomes: data.incomes,
        expenses: data.expenses,
        oneOffs: data.oneOffs,
      }),
    [today, monthOffset, data.currentBalance, data.incomes, data.expenses, data.oneOffs],
  );

  const byKey = useMemo(() => new Map(days.map((d) => [d.key, d])), [days]);

  // Monday-first grid covering the visible month.
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
    (d) => d.date.getMonth() === visibleMonth.getMonth() && d.date.getFullYear() === visibleMonth.getFullYear(),
  );
  const paydaysThisMonth = monthDays.filter((d) => d.isPayday);
  const monthEvents = monthDays.filter(
    (d) =>
      (d.isPayday || d.bills.length > 0 || d.credits.length > 0) &&
      d.date.getTime() >= today.getTime(),
  );
  const lowest = monthDays.reduce<null | (typeof monthDays)[number]>(
    (min, d) => (min === null || d.balance < min.balance ? d : min),
    null,
  );
  const firstShort = days.find((d) => d.short) ?? null;

  const hasAnything = data.incomes.length > 0 || data.expenses.length > 0 || data.oneOffs.length > 0;
  // A stream or bill with no date can't be placed on a day, so it's spread
  // instead. Worth saying plainly — it's the difference between the calendar
  // being a rough shape and being the actual schedule.
  const undated = [...data.incomes, ...data.expenses].filter((entry) => !entry.nextDue).length;

  return (
    <>
      <PageHeader
        title={formatMonthYear(visibleMonth)}
        subtitle="What lands when, and what you're left holding after it does."
        actions={
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Previous month"
              disabled={monthOffset === 0}
              onClick={() => setMonthOffset((m) => Math.max(m - 1, 0))}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMonthOffset(0)}
              disabled={monthOffset === 0}
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Next month"
              onClick={() => setMonthOffset((m) => Math.min(m + 1, 24))}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        }
      />

      {!hasAnything && (
        <Alert className="mb-4">
          <AlertDescription className="flex flex-wrap items-center gap-2">
            Nothing to draw yet. Add what comes in and what goes out, give each one a date, and
            it lands here.
            <Button size="sm" variant="outline" onClick={() => onNavigate('budget')}>
              Add income and payments
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {hasAnything && undated > 0 && (
        <Alert className="mb-4">
          <AlertDescription className="flex flex-wrap items-center gap-2">
            {undated} {undated === 1 ? 'entry has' : 'entries have'} no date, so{' '}
            {undated === 1 ? 'it is' : 'they are'} spread evenly rather than landing on a day.
            Dating {undated === 1 ? 'it' : 'them'} is what turns this into an actual schedule.
            <Button size="sm" variant="outline" onClick={() => onNavigate('budget')}>
              Set dates
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {firstShort && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>
            You run out of money on {formatShortDate(firstShort.date)} — down to{' '}
            {formatCurrency(firstShort.balance)}. Something before then needs to move.
          </AlertDescription>
        </Alert>
      )}

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          featured
          label="Lowest point this month"
          value={lowest ? formatCurrency(lowest.balance) : '—'}
          hint={lowest ? `On ${formatShortDate(lowest.date)}` : 'Nothing projected yet'}
          muted={!lowest}
        />
        <StatCard
          label="Paydays"
          value={String(paydaysThisMonth.length)}
          hint={
            paydaysThisMonth.length > 0
              ? `Last one leaves ${formatCurrency(paydaysThisMonth[paydaysThisMonth.length - 1].balance)}`
              : 'None dated this month'
          }
          muted={paydaysThisMonth.length === 0}
        />
        <StatCard
          label="Cash today"
          value={formatCurrency(data.currentBalance)}
          hint="Where the projection starts"
        />
      </div>

      <Card>
        <CardContent>
          <div className="grid grid-cols-7 gap-1">
            {WEEKDAYS.map((label) => (
              <div
                key={label}
                className="pb-1 text-center text-[0.7rem] font-medium tracking-wide text-muted-foreground uppercase"
              >
                {label}
              </div>
            ))}

            {cells.map((date) => {
              const key = toDateInputValue(date);
              const entry = byKey.get(key);
              const inMonth = date.getMonth() === visibleMonth.getMonth();
              const isToday = isSameDay(date, today);
              const isPast = date.getTime() < today.getTime();
              const hasMoneyIn = !!entry && (entry.isPayday || entry.credits.length > 0);

              return (
                <div
                  key={key}
                  className={cn(
                    'flex min-h-24 flex-col gap-1 rounded-lg border p-1.5 text-left',
                    inMonth ? 'border-border' : 'border-transparent',
                    !inMonth && 'opacity-40',
                    isPast && 'bg-muted/40',
                    hasMoneyIn && 'border-primary/40 bg-accent/40',
                    entry?.short && 'border-destructive/50 bg-destructive/5',
                  )}
                >
                  <span
                    className={cn(
                      'text-xs tabular-nums',
                      isToday
                        ? 'flex size-5 items-center justify-center rounded-full bg-foreground font-semibold text-background'
                        : 'text-muted-foreground',
                    )}
                  >
                    {date.getDate()}
                  </span>

                  {entry && !isPast && (
                    <>
                      {/* Below sm a cell is barely wider than a date, so the
                          figures collapse to dots and the list underneath
                          carries the detail instead. */}
                      <span className="flex gap-1 sm:hidden" aria-hidden>
                        {hasMoneyIn && <span className="size-1.5 rounded-full bg-primary" />}
                        {entry.bills.length > 0 && (
                          <span className="size-1.5 rounded-full bg-muted-foreground" />
                        )}
                      </span>

                      <span className="hidden sm:contents">
                        {entry.paydays.map((pay) => (
                          <span
                            key={pay.id}
                            className="truncate text-[0.7rem] font-medium text-primary tabular-nums"
                            title={`${pay.name} +${formatCurrency(pay.amount)}`}
                          >
                            +{formatCurrency(pay.amount)} {pay.name}
                          </span>
                        ))}
                        {entry.credits.map((credit) => (
                          <span
                            key={credit.id}
                            className="truncate text-[0.7rem] font-medium text-primary"
                            title={`${credit.name} +${formatCurrency(credit.amount)} (one-off)`}
                          >
                            +{formatCurrency(credit.amount)} {credit.name}
                          </span>
                        ))}
                        {entry.bills.map((bill) => (
                          <span
                            key={bill.id}
                            className={cn(
                              'truncate text-[0.7rem]',
                              bill.oneOff ? 'font-medium text-foreground' : 'text-muted-foreground',
                            )}
                            title={`${bill.name} ${formatCurrency(bill.amount)}${bill.oneOff ? ' (one-off)' : ''}`}
                          >
                            −{formatCurrency(bill.amount)} {bill.name}
                          </span>
                        ))}
                        {/* The balance is the whole point, so it anchors the
                            cell — but only on days something actually happened,
                            or every square would be a wall of numbers. */}
                        {(hasMoneyIn || entry.bills.length > 0) && (
                          <span
                            className={cn(
                              'mt-auto text-xs font-semibold tabular-nums',
                              entry.short ? 'text-destructive' : 'text-foreground',
                            )}
                          >
                            {formatCurrency(entry.balance)}
                          </span>
                        )}
                      </span>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* Carries the detail the grid can't hold on a narrow screen, and
              reads as a plain statement of the month on a wide one. */}
          {monthEvents.length > 0 && (
            <ul className="mt-4 space-y-1 border-t border-border pt-3">
              {monthEvents.map((entry) => {
                const parts = [
                  ...entry.paydays.map((p) => ({ key: p.id, text: `${p.name} +${formatCurrency(p.amount)}`, in: true })),
                  ...entry.credits.map((c) => ({ key: c.id, text: `${c.name} +${formatCurrency(c.amount)}`, in: true })),
                  ...entry.bills.map((b) => ({ key: b.id, text: `${b.name} −${formatCurrency(b.amount)}`, in: false })),
                ];
                return (
                  <li key={entry.key} className="flex flex-wrap items-baseline gap-x-2 text-sm">
                    <span className="w-16 shrink-0 text-muted-foreground tabular-nums">
                      {entry.date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                    </span>
                    <span className="min-w-0 flex-1">
                      {parts.map((part, i) => (
                        <span
                          key={part.key}
                          className={part.in ? 'font-medium text-primary' : 'text-muted-foreground'}
                        >
                          {i > 0 && <span className="text-muted-foreground"> · </span>}
                          {part.text}
                        </span>
                      ))}
                    </span>
                    <span
                      className={cn(
                        'shrink-0 font-semibold tabular-nums',
                        entry.short ? 'text-destructive' : 'text-foreground',
                      )}
                    >
                      {formatCurrency(entry.balance)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="mt-4">
        <OneOffSection
          oneOffs={data.oneOffs}
          today={today}
          onAdd={addOneOff}
          onUpdate={updateOneOff}
          onRemove={removeOneOff}
        />
      </div>
    </>
  );
}
