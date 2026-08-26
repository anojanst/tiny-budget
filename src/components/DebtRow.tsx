import { memo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { Debt, LenderType } from '@/types/budget';
import type { DebtOutcome } from '@/lib/debtMath';
import { formatCurrency, formatWeeksRemaining } from '@/lib/format';
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
    /* The active debt gets a tinted rail: at a glance, this is the one every
       spare dollar is going to right now. */
    <div
      className={cn(
        'py-2',
        isActive && 'rounded-md border-l-2 border-l-rose-500 bg-rose-500/5 pl-2 dark:border-l-rose-400',
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium tabular-nums"
          title={`Payoff order: #${position}`}
        >
          {position}
        </span>
        <Input
          value={debt.name}
          onChange={(e) => onUpdate(debt.id, { name: e.target.value })}
          placeholder="Debt name"
          className="min-w-28 flex-1"
        />
        <Input
          type="number"
          min="0"
          step="0.01"
          value={debt.balance}
          onChange={(e) => onUpdate(debt.id, { balance: Math.max(e.target.valueAsNumber || 0, 0) })}
          placeholder="Balance"
          className="w-28"
          aria-label={`${debt.name || 'Debt'} balance`}
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

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <div className="relative w-28 shrink-0" title="Minimum payment per week">
          <Input
            type="number"
            min="0"
            step="0.01"
            value={debt.minimumPayment}
            onChange={(e) =>
              onUpdate(debt.id, { minimumPayment: Math.max(e.target.valueAsNumber || 0, 0) })
            }
            placeholder="Min/wk"
            aria-label={`${debt.name || 'Debt'} minimum payment per week`}
            className="pr-9"
          />
          <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs text-muted-foreground">
            /wk
          </span>
        </div>
        <div className="relative w-24 shrink-0" title="Annual interest rate">
          <Input
            type="number"
            min="0"
            step="0.1"
            value={Number((debt.apr * 100).toFixed(2))}
            onChange={(e) =>
              onUpdate(debt.id, { apr: Math.max(e.target.valueAsNumber || 0, 0) / 100 })
            }
            placeholder="APR"
            aria-label={`${debt.name || 'Debt'} annual interest rate`}
            className="pr-7"
          />
          <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs text-muted-foreground">
            %
          </span>
        </div>
        <ToggleGroup
          value={[debt.lenderType]}
          onValueChange={(value) => {
            if (value[0]) onUpdate(debt.id, { lenderType: value[0] as LenderType });
          }}
          variant="outline"
          size="sm"
        >
          <ToggleGroupItem value="institutional">Lender</ToggleGroupItem>
          <ToggleGroupItem value="personal">Family</ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="mt-2 space-y-1">
        {isActive && (
          <Badge className="bg-rose-500/15 text-rose-700 dark:bg-rose-400/15 dark:text-rose-300">
            <Target className="mr-1 size-3" />
            Attacking this one
          </Badge>
        )}
        {isPaid && (
          <Badge className="bg-emerald-500/15 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300">
            Paid off!
          </Badge>
        )}
        {!isPaid && outcome?.status === 'on-track' && outcome.payoffWeek !== null && (
          <p className="text-sm text-muted-foreground">
            Clear in {formatWeeksRemaining(outcome.payoffWeek)}
            {outcome.interestPaid > 0.5 && (
              <span> · {formatCurrency(outcome.interestPaid)} interest</span>
            )}
          </p>
        )}
        {!isPaid && outcome?.status === 'paid' && outcome.payoffWeek !== null && (
          <p className="text-sm text-muted-foreground">
            {outcome.payoffWeek === 0
              ? 'Cleared instantly by your cash on hand'
              : `Clear in ${formatWeeksRemaining(outcome.payoffWeek)}`}
            {outcome.interestPaid > 0.5 && (
              <span> · {formatCurrency(outcome.interestPaid)} interest</span>
            )}
          </p>
        )}
        {outcome?.status === 'unreachable' && (
          <Alert variant="destructive">
            <AlertDescription>
              {debt.minimumPayment > 0
                ? "This payment doesn't cover the interest — the balance grows faster than you pay it. Raise the payment or the rate has to come down."
                : 'No payment set, so this never gets paid off. Set a weekly minimum.'}
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
});
