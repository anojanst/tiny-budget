import { formatCurrency, formatWeeksRemaining } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Debt, Goal } from '@/types/budget';
import type { SnowballResult } from '@/lib/debtMath';
import type { GoalProgress } from '@/lib/budgetMath';
import { Target, Sparkles } from 'lucide-react';

interface FocusCardProps {
  activeDebt?: Debt;
  snowball: SnowballResult;
  goals: Goal[];
  topGoal?: Goal;
  topGoalProgress?: GoalProgress;
  hasDebts: boolean;
}

/**
 * One card, one instruction. A dashboard full of numbers still leaves "so what
 * do I actually do?" unanswered, so this names the single thing every spare
 * dollar is going to right now.
 *
 * The queue below it is deliberately not a percentage bar: the app models a
 * plan, not a payment history, so "percent paid" would sit at zero until
 * someone hand-edits a balance. Position in the queue is the thing that
 * actually moves as the plan changes.
 */
export function FocusCard({
  activeDebt,
  snowball,
  goals,
  topGoal,
  topGoalProgress,
  hasDebts,
}: FocusCardProps) {
  const outcome = activeDebt ? snowball.outcomeById.get(activeDebt.id) : undefined;

  const title = hasDebts
    ? (activeDebt?.name ?? 'All debts cleared')
    : (topGoal?.name ?? 'No goal set');

  const caption = hasDebts
    ? activeDebt
      ? outcome?.status === 'unreachable'
        ? 'Not being paid off — raise the payment'
        : outcome?.payoffWeek != null
          ? `Clear in ${formatWeeksRemaining(outcome.payoffWeek)}`
          : 'Working on it'
      : "You're debt free — nice work"
    : topGoal
      ? topGoalProgress?.status === 'unreachable'
        ? 'No money reaching this yet'
        : topGoalProgress?.weeksRemaining != null
          ? `Funded in ${formatWeeksRemaining(topGoalProgress.weeksRemaining)}`
          : 'Working on it'
      : 'Add a goal to start putting money aside';

  const amount = hasDebts
    ? formatCurrency(activeDebt?.balance ?? 0)
    : topGoal
      ? formatCurrency(Math.max(topGoal.targetAmount - topGoal.currentSaved, 0))
      : formatCurrency(0);

  // The queue in payoff order, so the card doubles as "what happens after this".
  const queue = hasDebts
    ? snowball.order.map((debt) => ({
        id: debt.id,
        name: debt.name || 'Untitled',
        done: debt.balance <= 0,
        current: debt.id === activeDebt?.id,
      }))
    : [...goals]
        .sort((a, b) => a.priority - b.priority)
        .map((goal) => ({
          id: goal.id,
          name: goal.name || 'Untitled',
          done: goal.currentSaved >= goal.targetAmount && goal.targetAmount > 0,
          current: goal.id === topGoal?.id,
        }));

  const position = queue.findIndex((item) => item.current) + 1;

  return (
    /* The one dark surface in the app. It isn't decoration — it marks the
       single card that tells you what to do, so it never gets lost among the
       white panels reporting numbers. */
    <div className="flex h-full flex-col justify-between gap-6 rounded-xl bg-foreground p-5 text-background">
      <div className="flex items-center gap-2 text-xs tracking-wide text-background/60 uppercase">
        {hasDebts ? <Target className="size-3.5" /> : <Sparkles className="size-3.5" />}
        {hasDebts ? 'Attacking now' : 'Next up'}
      </div>

      <div>
        <p className="truncate text-lg font-semibold">{title}</p>
        <p className="mt-0.5 text-3xl font-semibold tracking-tight tabular-nums">{amount}</p>
        <p className="mt-1 text-xs text-background/60">{caption}</p>
      </div>

      {queue.length > 0 && (
        <div>
          {/* One segment per item, so the queue's length and your place in it
              are both readable at a glance. */}
          <div className="flex gap-1" aria-hidden>
            {queue.map((item) => (
              <span
                key={item.id}
                className={cn(
                  'h-1.5 flex-1 rounded-full',
                  item.done || item.current ? 'bg-primary' : 'bg-background/20',
                  item.current && 'ring-2 ring-primary/40',
                )}
              />
            ))}
          </div>
          <p className="mt-2 text-xs text-background/60">
            {position > 0
              ? `${position} of ${queue.length} — ${hasDebts ? 'then' : 'next'} ${
                  queue[position]?.name ?? (hasDebts ? 'you’re done' : 'nothing queued')
                }`
              : `${queue.length} ${hasDebts ? 'debts' : 'goals'} listed`}
          </p>
        </div>
      )}
    </div>
  );
}
