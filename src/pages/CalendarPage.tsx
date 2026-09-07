import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PageHeader } from '@/components/shell/PageHeader';
import { StatCard } from '@/components/StatCard';
import { buildCashflowDays } from '@/lib/calendar';
import { debtSpendAtWeek } from '@/lib/debtMath';
import { formatCurrency } from '@/lib/format';
import {
  addMonths,
  endOfMonth,
  formatMonthYear,
  formatShortDate,
  isSameDay,
  parseLocalDate,
  startOfMonth,
  toDateInputValue,
} from '@/lib/dates';
import { cn } from '@/lib/utils';
import type { useBudget } from '@/hooks/useBudget';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface CalendarPageProps {
  budget: ReturnType<typeof useBudget>;
}

export function CalendarPage({ budget }: CalendarPageProps) {
  const { budget: data, today, snowball, hasDebts, setIncome } = budget;
  const [monthOffset, setMonthOffset] = useState(0);

  const visibleMonth = useMemo(() => addMonths(startOfMonth(today), monthOffset), [today, monthOffset]);
  const nextPayday = data.income.nextPayday ? parseLocalDate(data.income.nextPayday) : null;

  // Always projected from today, however far ahead the view is scrolled — a
  // balance is only meaningful as the running total of everything before it.
  const days = useMemo(
    () =>
      buildCashflowDays({
        from: today,
        through: endOfMonth(addMonths(startOfMonth(today), Math.max(monthOffset, 0))),
        startingBalance: data.currentBalance,
        income: data.income,
        nextPayday,
        expenses: data.expenses,
        cumulativeDebtSpend: (weeks) => (hasDebts ? debtSpendAtWeek(snowball, weeks) : 0),
      }),
    [today, monthOffset, data.currentBalance, data.income, data.expenses, nextPayday, hasDebts, snowball],
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
  const paydaysThisMonth = monthDays.filter((d) => d.incoming > 0);
  const monthEvents = monthDays.filter(
    (d) => (d.incoming > 0 || d.bills.length > 0) && d.date.getTime() >= today.getTime(),
  );
  const lowest = monthDays.reduce<null | (typeof monthDays)[number]>(
    (min, d) => (min === null || d.balance < min.balance ? d : min),
    null,
  );
  const firstShort = days.find((d) => d.short) ?? null;
  // A shortfall in the first week, while there's cash and debt, is the week-0
  // sweep rather than anything wrong with the budget itself.
  const causedByCashSweep =
    !!firstShort &&
    hasDebts &&
    data.currentBalance > 0 &&
    firstShort.date.getTime() - today.getTime() < 8 * 24 * 60 * 60 * 1000;

  return (
    <>
      <PageHeader
        title="Calendar"
        subtitle="What lands when, and what you're left holding on each payday."
        actions={
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              Next payday
              <Input
                type="date"
                value={data.income.nextPayday ?? ''}
                onChange={(e) => setIncome({ nextPayday: e.target.value || undefined })}
                aria-label="Next payday"
                className="w-40"
              />
            </label>
          </div>
        }
      />

      {!nextPayday && (
        <Alert className="mb-4">
          <AlertDescription>
            Set your next payday above and the calendar will mark every pay from then on, along
            with what you're left holding once the bills in between have gone out.
          </AlertDescription>
        </Alert>
      )}

      {firstShort && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>
            You run out of money on {formatShortDate(firstShort.date)} — down to{' '}
            {formatCurrency(firstShort.balance)}.
            {/* Nearly always the cause when the shortfall lands immediately:
                the plan puts every dollar of cash on the smallest debt on day
                one, which is fastest on paper and unlivable in practice. */}
            {causedByCashSweep
              ? ` That's the plan applying your ${formatCurrency(data.currentBalance)} to the smallest debt straight away. Paying the debt down fastest and keeping enough to live on are different goals — hold some back if this is too tight.`
              : ' Something before then needs to move.'}
          </AlertDescription>
        </Alert>
      )}

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          featured
          label={`Paydays in ${formatMonthYear(visibleMonth)}`}
          value={String(paydaysThisMonth.length)}
          hint={
            paydaysThisMonth.length > 0
              ? `Last one leaves ${formatCurrency(paydaysThisMonth[paydaysThisMonth.length - 1].balance)}`
              : nextPayday
                ? 'None fall in this month'
                : 'Set a payday to see them'
          }
          muted={paydaysThisMonth.length === 0}
        />
        <StatCard
          label="Lowest point"
          value={lowest ? formatCurrency(lowest.balance) : '—'}
          hint={lowest ? `On ${formatShortDate(lowest.date)}` : 'Nothing projected yet'}
          muted={!lowest}
        />
        <StatCard
          label="Cash today"
          value={formatCurrency(data.currentBalance)}
          hint="Where the projection starts"
        />
      </div>

      <Card>
        <CardContent>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold">{formatMonthYear(visibleMonth)}</h2>
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
          </div>

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

              return (
                <div
                  key={key}
                  className={cn(
                    'flex min-h-24 flex-col gap-1 rounded-lg border p-1.5 text-left',
                    inMonth ? 'border-border' : 'border-transparent',
                    !inMonth && 'opacity-40',
                    isPast && 'bg-muted/40',
                    entry?.incoming ? 'border-primary/40 bg-accent/40' : undefined,
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
                        {entry.incoming > 0 && (
                          <span className="size-1.5 rounded-full bg-primary" />
                        )}
                        {entry.bills.length > 0 && (
                          <span className="size-1.5 rounded-full bg-muted-foreground" />
                        )}
                      </span>

                      <span className="hidden sm:contents">
                        {entry.incoming > 0 && (
                          <span className="text-[0.7rem] font-medium text-primary tabular-nums">
                            +{formatCurrency(entry.incoming)}
                          </span>
                        )}
                        {entry.bills.map((bill) => (
                          <span
                            key={bill.id}
                            className="truncate text-[0.7rem] text-muted-foreground"
                            title={`${bill.name} ${formatCurrency(bill.amount)}`}
                          >
                            −{formatCurrency(bill.amount)} {bill.name}
                          </span>
                        ))}
                        {/* The balance is the whole point, so it anchors the
                            cell — but only on days something actually happened,
                            or every square would be a wall of numbers. */}
                        {(entry.incoming > 0 || entry.bills.length > 0) && (
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
              {monthEvents.map((entry) => (
                <li key={entry.key} className="flex flex-wrap items-baseline gap-x-2 text-sm">
                  <span className="w-16 shrink-0 text-muted-foreground tabular-nums">
                    {entry.date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                  </span>
                  <span className="min-w-0 flex-1">
                    {entry.incoming > 0 && (
                      <span className="font-medium text-primary">
                        Payday +{formatCurrency(entry.incoming)}
                      </span>
                    )}
                    {entry.incoming > 0 && entry.bills.length > 0 && (
                      <span className="text-muted-foreground"> · </span>
                    )}
                    {entry.bills.map((bill, i) => (
                      <span key={bill.id} className="text-muted-foreground">
                        {i > 0 && ' · '}
                        {bill.name} −{formatCurrency(bill.amount)}
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
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}
