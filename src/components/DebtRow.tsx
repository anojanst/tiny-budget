import { memo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { Debt } from '@/types/budget';
import type { DebtOutcome } from '@/lib/debtMath';
import { formatWeeksRemaining } from '@/lib/format';
import { cn } from '@/lib/utils';
import { X, Target } from 'lucide-react';

interface DebtRowProps {
  debt: Debt;
  /** Position in the payoff queue, 1-based. */
  position: number;
  outcome?: DebtOutcome;
  /** True for the one debt currently absorbing the whole snowball. */
  isActive: boolean;
  onUpdate: (id: string, patch: Partial<Omit<Debt, 'id'>>) => void;
  onRemove: (id: string) => void;
}

/**
 * A self-contained tile rather than a wide row, so two fit side by side on a
 * desktop column. Only two numbers are asked for — balance and minimum — which
 * is the whole model.
 */
export const DebtRow = memo(function DebtRow({
  debt,
  position,
  outcome,
  isActive,
  onUpdate,
  onRemove,
}: DebtRowProps) {
  const isPaid = debt.balance <= 0;

  return (
    <div
      className={cn(
        'flex h-full flex-col gap-3 rounded-xl border p-4 transition-colors',
        isActive ? 'border-primary/40 bg-accent/40' : 'border-border bg-card',
      )}
    >
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium tabular-nums',
            isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
          )}
          title={`Payoff order: #${position}`}
        >
          {position}
        </span>
        <Input
          value={debt.name}
          onChange={(e) => onUpdate(debt.id, { name: e.target.value })}
          placeholder="Debt name"
          className="min-w-0 flex-1"
        />
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0"
          aria-label={`Remove ${debt.name || 'debt'}`}
          onClick={() => onRemove(debt.id)}
        >
          <X className="size-4" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-[0.7rem] text-muted-foreground">Balance owed</span>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={debt.balance}
            onChange={(e) => onUpdate(debt.id, { balance: Math.max(e.target.valueAsNumber || 0, 0) })}
            aria-label={`${debt.name || 'Debt'} balance`}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[0.7rem] text-muted-foreground">Minimum / week</span>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={debt.minimumPayment}
            onChange={(e) =>
              onUpdate(debt.id, { minimumPayment: Math.max(e.target.valueAsNumber || 0, 0) })
            }
            aria-label={`${debt.name || 'Debt'} minimum payment per week`}
          />
        </label>
      </div>

      {/* Status pinned to the bottom so tiles in a row line up even when one
          of them is carrying a wrapped warning. */}
      <div className="mt-auto space-y-1.5 pt-1">
        {isActive && (
          <Badge className="bg-primary text-primary-foreground">
            <Target className="mr-1 size-3" />
            Attacking this one
          </Badge>
        )}
        {isPaid && <Badge className="bg-accent text-accent-foreground">Paid off!</Badge>}
        {!isPaid && outcome?.payoffWeek != null && outcome.status !== 'unreachable' && (
          <p className="text-sm text-muted-foreground">
            {outcome.payoffWeek === 0
              ? 'Cleared instantly by your cash on hand'
              : `Clear in ${formatWeeksRemaining(outcome.payoffWeek)}`}
          </p>
        )}
        {outcome?.status === 'unreachable' && (
          <Alert variant="destructive">
            <AlertDescription>
              Nothing is reaching this debt. Set a weekly minimum, or free up money each week.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
});
