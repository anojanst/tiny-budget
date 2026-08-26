import { useEffect, useState } from 'react';
import { formatCurrency, formatWeeksRemaining } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Debt, Goal } from '@/types/budget';
import type { SnowballResult } from '@/lib/debtMath';
import type { GoalProgress } from '@/lib/budgetMath';
import { Target, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';

interface FocusCardProps {
  activeDebt?: Debt;
  snowball: SnowballResult;
  goals: Goal[];
  goalProgressById: Map<string, GoalProgress>;
  hasDebts: boolean;
}

interface QueueItem {
  id: string;
  name: string;
  amount: number;
  caption: string;
}

/**
 * One card, one instruction: the single thing every spare dollar is going to
 * right now. The queue behind it is browsable, because "what happens after
 * this one" is the obvious next question and the answer is already computed.
 */
export function FocusCard({
  activeDebt,
  snowball,
  goals,
  goalProgressById,
  hasDebts,
}: FocusCardProps) {
  const queue: QueueItem[] = hasDebts
    ? snowball.order.map((debt) => {
        const outcome = snowball.outcomeById.get(debt.id);
        return {
          id: debt.id,
          name: debt.name || 'Untitled debt',
          amount: debt.balance,
          caption:
            outcome?.status === 'unreachable'
              ? 'Not being paid off — raise the payment'
              : outcome?.payoffWeek === 0
                ? 'Your cash on hand clears this today'
                : outcome?.payoffWeek != null
                  ? `Clear in ${formatWeeksRemaining(outcome.payoffWeek)}`
                  : 'Working on it',
        };
      })
    : [...goals]
        .sort((a, b) => a.priority - b.priority)
        .map((goal) => {
          const progress = goalProgressById.get(goal.id);
          return {
            id: goal.id,
            name: goal.name || 'Untitled goal',
            amount: Math.max(goal.targetAmount - goal.currentSaved, 0),
            caption:
              progress?.status === 'met'
                ? 'Fully funded'
                : progress?.status === 'unreachable'
                  ? 'No money reaching this yet'
                  : progress?.weeksRemaining != null
                    ? `Funded in ${formatWeeksRemaining(progress.weeksRemaining)}`
                    : 'Working on it',
          };
        });

  // The item being worked on now — where the card resets to whenever the plan
  // changes underneath it, so browsing never leaves you on a stale entry.
  const focusIndex = Math.max(
    hasDebts
      ? queue.findIndex((item) => item.id === activeDebt?.id)
      : queue.findIndex((item) => item.amount > 0),
    0,
  );

  const [index, setIndex] = useState(focusIndex);
  useEffect(() => setIndex(focusIndex), [focusIndex, queue.length]);

  if (queue.length === 0) {
    return (
      <div className="flex h-full flex-col justify-between gap-6 rounded-xl bg-foreground p-5 text-background">
        <div className="flex items-center gap-2 text-xs tracking-wide text-background/60 uppercase">
          {hasDebts ? <Target className="size-3.5" /> : <Sparkles className="size-3.5" />}
          {hasDebts ? 'Attacking now' : 'Next up'}
        </div>
        <div>
          <p className="text-lg font-semibold">{hasDebts ? 'All debts cleared' : 'No goal set'}</p>
          <p className="mt-1 text-xs text-background/60">
            {hasDebts
              ? "You're debt free — nice work"
              : 'Add a goal to start putting money aside'}
          </p>
        </div>
        <div />
      </div>
    );
  }

  const current = queue[Math.min(index, queue.length - 1)];
  const isFocused = index === focusIndex;
  const step = (delta: number) =>
    setIndex((i) => (i + delta + queue.length) % queue.length);

  return (
    /* The one dark surface in the app. It isn't decoration — it marks the
       single card that tells you what to do, so it never gets lost among the
       white panels reporting numbers. */
    <div className="flex h-full flex-col justify-between gap-6 rounded-xl bg-foreground p-5 text-background">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-xs tracking-wide text-background/60 uppercase">
          {hasDebts ? <Target className="size-3.5" /> : <Sparkles className="size-3.5" />}
          {isFocused ? (hasDebts ? 'Attacking now' : 'Next up') : `Up next · ${index + 1} of ${queue.length}`}
        </span>
        {queue.length > 1 && (
          <span className="flex shrink-0 gap-1">
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label="Previous in queue"
              className="flex size-6 items-center justify-center rounded-full border border-background/25 text-background/70 transition-colors hover:bg-background/15 hover:text-background"
            >
              <ChevronLeft className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label="Next in queue"
              className="flex size-6 items-center justify-center rounded-full border border-background/25 text-background/70 transition-colors hover:bg-background/15 hover:text-background"
            >
              <ChevronRight className="size-3.5" />
            </button>
          </span>
        )}
      </div>

      <div>
        <p className="truncate text-lg font-semibold">{current.name}</p>
        <p className="mt-0.5 text-3xl font-semibold tracking-tight tabular-nums">
          {formatCurrency(current.amount)}
        </p>
        <p className="mt-1 text-xs text-background/60">{current.caption}</p>
      </div>

      <div>
        {/* One segment per item, in payoff order. Clickable, because they look
            like they should be — and the data behind each one already exists. */}
        <div className="flex gap-1">
          {queue.map((item, i) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Show ${item.name}`}
              aria-current={i === index}
              className="group flex-1 py-1"
            >
              <span
                className={cn(
                  'block h-1.5 rounded-full transition-colors',
                  i === focusIndex
                    ? 'bg-primary'
                    : i === index
                      ? 'bg-background/70'
                      : 'bg-background/20 group-hover:bg-background/40',
                )}
              />
            </button>
          ))}
        </div>
        <p className="mt-1 text-xs text-background/60">
          {isFocused
            ? queue.length > 1
              ? `Then ${queue[(index + 1) % queue.length].name}`
              : hasDebts
                ? 'Last one to go'
                : 'Your only goal'
            : 'Browsing the queue — tap the green bar to return'}
        </p>
      </div>
    </div>
  );
}
