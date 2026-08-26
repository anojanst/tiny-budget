import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/format';
import { addMonths, formatShortDate, toDateInputValue } from '@/lib/dates';
import { cn } from '@/lib/utils';

const PRESETS = [
  { label: '1M', months: 1 },
  { label: '3M', months: 3 },
  { label: '6M', months: 6 },
  { label: '1Y', months: 12 },
];

interface TimeMachineProps {
  today: Date;
  dateValue: string;
  onDateChange: (value: string) => void;
  targetDate: Date | null;
  weeks: number;
  freeBalance: number;
  /** Cash paid off debts by the horizon — money that has left for good. */
  debtSpend: number;
  hasDebts: boolean;
  debtFreeWeek: number | null;
  debtsClearedByHorizon: boolean;
  className?: string;
}

/**
 * Lives in the sidebar rather than on a page, because "where will I be by X"
 * is a question you ask against whatever you're currently editing — expenses,
 * debts, goals — not a destination of its own.
 *
 * Laid out for a narrow column: everything stacks, and only the free figure
 * gets any size.
 */
export function TimeMachine({
  today,
  dateValue,
  onDateChange,
  targetDate,
  weeks,
  freeBalance,
  debtSpend,
  hasDebts,
  debtFreeWeek,
  debtsClearedByHorizon,
  className,
}: TimeMachineProps) {
  return (
    <div className={cn('rounded-xl border border-border bg-muted/40 p-3.5', className)}>
      <p className="mb-2 text-[0.7rem] font-medium tracking-wider text-muted-foreground uppercase">
        Time machine
      </p>

      <Input
        type="date"
        value={dateValue}
        min={toDateInputValue(today)}
        onChange={(e) => onDateChange(e.target.value)}
        className="w-full bg-card"
        aria-label="Travel to date"
      />

      <div className="mt-1.5 grid grid-cols-4 gap-1">
        {PRESETS.map((preset) => {
          const isActive = dateValue === toDateInputValue(addMonths(today, preset.months));
          return (
            <button
              key={preset.label}
              type="button"
              aria-pressed={isActive}
              onClick={() => onDateChange(toDateInputValue(addMonths(today, preset.months)))}
              className={cn(
                'rounded-md py-1 text-[0.7rem] font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card text-muted-foreground hover:text-foreground',
              )}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      <div className="mt-3 border-t border-border pt-3">
        <p className="text-[0.7rem] text-muted-foreground">
          {targetDate ? `By ${formatShortDate(targetDate)}` : 'Pick a date'}
        </p>
        <p className="mt-0.5 text-xl font-semibold tracking-tight tabular-nums text-primary">
          {formatCurrency(freeBalance)}
          <span className="ml-1 text-xs font-normal text-muted-foreground">free</span>
        </p>

        {/* One line of context, not three — in a sidebar the reason the number
            is what it is matters more than the full reconciliation. */}
        {hasDebts && debtFreeWeek !== null && !debtsClearedByHorizon && (
          <p className="mt-1 text-[0.7rem] leading-snug text-muted-foreground">
            Still paying off debt until week {debtFreeWeek} — {formatCurrency(debtSpend)} of it by
            then.
          </p>
        )}
        {hasDebts && debtsClearedByHorizon && debtFreeWeek !== null && (
          <p className="mt-1 text-[0.7rem] leading-snug text-primary">
            Debt free at week {debtFreeWeek} — it piles up after that.
          </p>
        )}
        {hasDebts && debtFreeWeek === null && (
          <p className="mt-1 text-[0.7rem] leading-snug text-muted-foreground">
            Nothing comes free while a debt isn't being paid off.
          </p>
        )}
        {!hasDebts && weeks > 0 && (
          <p className="mt-1 text-[0.7rem] leading-snug text-muted-foreground">
            {Math.round(weeks)} weeks of saving from today.
          </p>
        )}
      </div>
    </div>
  );
}
