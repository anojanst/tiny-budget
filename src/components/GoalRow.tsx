import { memo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { Goal } from '@/types/budget';
import type { GoalAtDate, GoalProgress, GoalStatus } from '@/lib/budgetMath';
import { formatCurrency, formatWeeksRemaining } from '@/lib/format';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

/** The bar's solid fill carries the goal's real state; the ghost behind it
 * (when present) is the Time Machine's projection for the selected date. */
const BAR_FILL: Record<GoalStatus, string> = {
  met: 'bg-primary',
  unreachable: 'bg-destructive',
  'on-track': 'bg-primary/70',
};

interface GoalRowProps {
  goal: Goal;
  progress: GoalProgress;
  /** How many goals (including this one) share its priority number. */
  tierSize: number;
  /** Where this goal lands at the Time Machine's selected date, if set. */
  projection?: GoalAtDate;
  horizonLabel?: string;
  /** Why nothing is reaching this goal — the cause differs while in debt. */
  unreachableHint: string;
  onUpdate: (id: string, patch: Partial<Omit<Goal, 'id'>>) => void;
  onRemove: (id: string) => void;
}

/**
 * A self-contained tile rather than a wide row, so several fit across a
 * desktop column — matching the debt tiles, since the two lists are read the
 * same way.
 */
export const GoalRow = memo(function GoalRow({
  goal,
  progress,
  tierSize,
  projection,
  horizonLabel,
  unreachableHint,
  onUpdate,
  onRemove,
}: GoalRowProps) {
  const currentPercent = progress.percentComplete;
  const projectedPercent = projection?.projectedPercent ?? currentPercent;
  const showsProjection = projectedPercent > currentPercent + 0.5;

  return (
    <div className="flex h-full flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <div
          className="relative w-12 shrink-0"
          title="Priority — lower number is funded first"
        >
          <span className="pointer-events-none absolute inset-y-0 left-2 flex items-center text-xs text-muted-foreground">
            #
          </span>
          <Input
            type="number"
            min="1"
            step="1"
            value={goal.priority}
            onChange={(e) =>
              onUpdate(goal.id, { priority: Math.max(1, Math.round(e.target.valueAsNumber) || 1) })
            }
            aria-label={`${goal.name || 'Goal'} priority — lower number is funded first`}
            className="px-0 pl-5"
          />
        </div>
        <Input
          value={goal.name}
          onChange={(e) => onUpdate(goal.id, { name: e.target.value })}
          placeholder="Goal name"
          className="min-w-0 flex-1"
        />
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0"
          aria-label={`Remove ${goal.name || 'goal'}`}
          onClick={() => onRemove(goal.id)}
        >
          <X className="size-4" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-[0.7rem] text-muted-foreground">Saved so far</span>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={goal.currentSaved}
            onChange={(e) => onUpdate(goal.id, { currentSaved: e.target.valueAsNumber || 0 })}
            aria-label={`${goal.name || 'Goal'} saved so far`}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[0.7rem] text-muted-foreground">Target</span>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={goal.targetAmount}
            onChange={(e) => onUpdate(goal.id, { targetAmount: e.target.valueAsNumber || 0 })}
            aria-label={`${goal.name || 'Goal'} target amount`}
          />
        </label>
      </div>

      <div className="flex items-center gap-3">
        <div
          role="progressbar"
          aria-valuenow={Math.round(currentPercent)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${goal.name || 'Goal'} progress`}
          className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
        >
          {/* Ghost sits behind the solid fill — the gap between them is the
              progress the Time Machine's selected date would add. */}
          {showsProjection && (
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-primary/25"
              style={{ width: `${projectedPercent}%` }}
            />
          )}
          <div
            className={cn(
              'absolute inset-y-0 left-0 rounded-full transition-[width]',
              BAR_FILL[progress.status],
            )}
            style={{ width: `${currentPercent}%` }}
          />
        </div>
        <span className="shrink-0 text-right text-sm tabular-nums text-muted-foreground">
          {Math.round(currentPercent)}%
          {showsProjection && (
            <span className="text-primary">
              {' → '}
              {Math.round(projectedPercent)}%
            </span>
          )}
        </span>
      </div>

      {/* Status pinned to the bottom so tiles in a row line up even when one
          of them is carrying a wrapped warning. */}
      <div className="mt-auto space-y-1 pt-1">
        {progress.status === 'met' && (
          <Badge className="bg-primary text-primary-foreground">Goal met!</Badge>
        )}
        {progress.status === 'on-track' && progress.weeksRemaining !== null && (
          <p className="text-sm leading-snug text-muted-foreground">
            {formatCurrency(progress.remainingAmount)} left —{' '}
            {formatWeeksRemaining(progress.weeksRemaining)}
          </p>
        )}
        {progress.status === 'on-track' && tierSize > 1 && (
          <p className="text-xs text-muted-foreground">
            Splits priority {goal.priority} with {tierSize - 1} other
            {tierSize - 1 > 1 ? 's' : ''}
          </p>
        )}
        {progress.status === 'unreachable' && (
          <Alert variant="destructive">
            <AlertDescription>{unreachableHint}</AlertDescription>
          </Alert>
        )}
        {showsProjection && horizonLabel && (
          <p className="text-xs text-muted-foreground">
            {projection?.reached ? 'Reached' : `${Math.round(projectedPercent)}%`} by{' '}
            {horizonLabel}
          </p>
        )}
      </div>
    </div>
  );
});
