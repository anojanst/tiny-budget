import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { Frequency, MoneyEntry } from '@/types/budget';
import { formatCurrency, } from '@/lib/format';
import { toWeeklyAmount } from '@/lib/budgetMath';
import { X } from 'lucide-react';

const SLIDER_MAX = 1000;

interface MoneyEntryRowProps {
  entry: MoneyEntry;
  onUpdate: (id: string, patch: Partial<Omit<MoneyEntry, 'id'>>) => void;
  onRemove: (id: string) => void;
}

export function MoneyEntryRow({ entry, onUpdate, onRemove }: MoneyEntryRowProps) {
  const weekly = toWeeklyAmount(entry.amount, entry.frequency);

  return (
    /* Remove sits outside the wrapping group and stays pinned to the row's
       top-right, so a narrow column wraps the fields without orphaning it. */
    <div className="flex items-start gap-2 py-2">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={entry.name}
            onChange={(e) => onUpdate(entry.id, { name: e.target.value })}
            placeholder="Name"
            className="min-w-24 flex-1"
          />
          <Input
            type="number"
            min="0"
            step="0.01"
            value={entry.amount}
            onChange={(e) => onUpdate(entry.id, { amount: e.target.valueAsNumber || 0 })}
            placeholder="Amount"
            className="w-24"
          />
          <ToggleGroup
            value={[entry.frequency]}
            onValueChange={(value) => {
              if (value[0]) onUpdate(entry.id, { frequency: value[0] as Frequency });
            }}
            variant="outline"
            size="sm"
          >
            <ToggleGroupItem value="weekly">Weekly</ToggleGroupItem>
            <ToggleGroupItem value="monthly">Monthly</ToggleGroupItem>
          </ToggleGroup>
          {/* Always rendered at a fixed width: it puts every row on one
              comparable basis, and keeps the name field the same size
              regardless of frequency. */}
          <span className="w-24 shrink-0 text-right text-sm tabular-nums text-muted-foreground">
            {formatCurrency(weekly)}/wk
          </span>
        </div>
        <Slider
          className="mt-2"
          min={0}
          max={SLIDER_MAX}
          step={5}
          value={Math.min(entry.amount, SLIDER_MAX)}
          onValueChange={(value) => {
            if (typeof value === 'number') onUpdate(entry.id, { amount: value });
          }}
          aria-label={`${entry.name || 'Entry'} amount`}
        />
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0"
        aria-label={`Remove ${entry.name || 'entry'}`}
        onClick={() => onRemove(entry.id)}
      >
        <X className="size-4" />
      </Button>
    </div>
  );
}
