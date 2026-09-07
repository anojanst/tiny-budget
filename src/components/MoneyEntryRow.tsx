import { memo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CategoryCombobox } from '@/components/ui/category-combobox';
import { FrequencySelect } from '@/components/ui/frequency-select';
import { EXPENSE_CATEGORIES } from '@/lib/expenseCategories';
import type { Frequency, MoneyEntry } from '@/types/budget';
import { formatCurrency } from '@/lib/format';
import { isEntryActive, isLumpySchedule, nextDueOccurrence, toWeeklyAmount } from '@/lib/budgetMath';
import { formatShortDate, weeksBetween } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

interface MoneyEntryRowProps {
  entry: MoneyEntry;
  today: Date;
  onUpdate: (id: string, patch: Partial<Omit<MoneyEntry, 'id'>>) => void;
  onRemove: (id: string) => void;
}

/**
 * Deliberately terse: name, amount, how often, and the weekly figure it works
 * out to. A real budget runs to twenty-odd categories, and every pixel of row
 * height is multiplied by twenty.
 *
 * The schedule line only appears for lumpy cycles — quarterly and longer —
 * where the amount you set aside weekly and the date it's actually wanted are
 * different facts. A weekly grocery shop needs neither.
 */
export const MoneyEntryRow = memo(function MoneyEntryRow({
  entry,
  today,
  onUpdate,
  onRemove,
}: MoneyEntryRowProps) {
  const weekly = toWeeklyAmount(entry.amount, entry.frequency);
  const showsSchedule = isLumpySchedule(entry.frequency) || !!entry.nextDue || !!entry.endDate;
  const due = nextDueOccurrence(entry, today);
  const dueInWeeks = due ? Math.max(Math.round(weeksBetween(today, due)), 0) : null;
  // An ended commitment is kept on screen so it can be edited or revived, but
  // it no longer counts — which has to be visible, or the row's own figure
  // silently disagrees with the total at the top of the card.
  const ended = !isEntryActive(entry, today);

  return (
    <div className={cn('py-1', ended && 'opacity-60')}>
      <div className="flex items-center gap-1.5">
        <CategoryCombobox
          value={entry.name}
          onValueChange={(name) => onUpdate(entry.id, { name })}
          items={EXPENSE_CATEGORIES}
          placeholder="Name"
          aria-label="Expense name"
          className="min-w-0 flex-1"
        />
        <Input
          type="number"
          min="0"
          step="0.01"
          value={entry.amount}
          onChange={(e) => onUpdate(entry.id, { amount: e.target.valueAsNumber || 0 })}
          placeholder="Amount"
          className="w-20 shrink-0"
          aria-label={`${entry.name || 'Entry'} amount`}
        />
        <FrequencySelect
          value={entry.frequency}
          onValueChange={(frequency: Frequency) => onUpdate(entry.id, { frequency })}
          aria-label={`${entry.name || 'Entry'} frequency`}
          className="w-[4.5rem]"
        />
        {/* Fixed width so every row's weekly figure lines up in one column. */}
        <span
          className={cn(
            'w-[4.5rem] shrink-0 text-right text-sm tabular-nums text-muted-foreground',
            ended && 'line-through',
          )}
        >
          {formatCurrency(weekly)}
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          className="shrink-0"
          aria-label={`Remove ${entry.name || 'entry'}`}
          onClick={() => onRemove(entry.id)}
        >
          <X className="size-4" />
        </Button>
      </div>

      {showsSchedule && (
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 pl-1">
          <label className="flex items-center gap-1 text-[0.7rem] text-muted-foreground">
            Next due
            <Input
              type="date"
              value={entry.nextDue ?? ''}
              onChange={(e) => onUpdate(entry.id, { nextDue: e.target.value || undefined })}
              aria-label={`${entry.name || 'Entry'} next due date`}
              className="h-6 w-[8.25rem] px-1.5 text-xs"
            />
          </label>
          <label className="flex items-center gap-1 text-[0.7rem] text-muted-foreground">
            Ends
            <Input
              type="date"
              value={entry.endDate ?? ''}
              onChange={(e) => onUpdate(entry.id, { endDate: e.target.value || undefined })}
              aria-label={`${entry.name || 'Entry'} end date`}
              className="h-6 w-[8.25rem] px-1.5 text-xs"
            />
          </label>
          {ended ? (
            <span className="text-[0.7rem] font-medium text-muted-foreground">
              · Ended — no longer counted
            </span>
          ) : (
            due &&
            dueInWeeks !== null && (
              <span className="text-[0.7rem] text-muted-foreground">
                · {formatShortDate(due)}, in {dueInWeeks} week{dueInWeeks === 1 ? '' : 's'}
              </span>
            )
          )}
        </div>
      )}
    </div>
  );
});
