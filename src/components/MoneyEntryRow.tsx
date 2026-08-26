import { memo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CategoryCombobox } from '@/components/ui/category-combobox';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { EXPENSE_CATEGORIES } from '@/lib/expenseCategories';
import type { Frequency, MoneyEntry } from '@/types/budget';
import { formatCurrency } from '@/lib/format';
import { toWeeklyAmount } from '@/lib/budgetMath';
import { X } from 'lucide-react';

interface MoneyEntryRowProps {
  entry: MoneyEntry;
  onUpdate: (id: string, patch: Partial<Omit<MoneyEntry, 'id'>>) => void;
  onRemove: (id: string) => void;
}

/**
 * Deliberately terse: name, amount, how often, and the weekly figure it works
 * out to. A real budget runs to twenty-odd categories, and every pixel of row
 * height is multiplied by twenty — so the tuning slider that used to live here
 * was cut in favour of fitting the whole list on screen at once.
 */
export const MoneyEntryRow = memo(function MoneyEntryRow({
  entry,
  onUpdate,
  onRemove,
}: MoneyEntryRowProps) {
  const weekly = toWeeklyAmount(entry.amount, entry.frequency);

  return (
    <div className="flex items-center gap-1.5 py-1">
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
      <ToggleGroup
        value={[entry.frequency]}
        onValueChange={(value) => {
          if (value[0]) onUpdate(entry.id, { frequency: value[0] as Frequency });
        }}
        variant="outline"
        size="sm"
        className="shrink-0"
      >
        {/* Abbreviated: at two columns the full words cost more width than the
            list can spare, and the pair reads unambiguously together. */}
        <ToggleGroupItem value="weekly" aria-label="Weekly">
          Wk
        </ToggleGroupItem>
        <ToggleGroupItem value="monthly" aria-label="Monthly">
          Mo
        </ToggleGroupItem>
      </ToggleGroup>
      {/* Fixed width so every row's weekly figure lines up in one column. */}
      <span className="w-[4.5rem] shrink-0 text-right text-sm tabular-nums text-muted-foreground">
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
  );
});
