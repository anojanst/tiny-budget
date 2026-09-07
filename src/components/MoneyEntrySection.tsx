import { useState } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { MoneyEntryRow } from '@/components/MoneyEntryRow';
import { CategoryCombobox } from '@/components/ui/category-combobox';
import { FrequencySelect } from '@/components/ui/frequency-select';
import { WidgetHeading } from '@/components/WidgetHeading';

import { formatCurrency } from '@/lib/format';
import type { Frequency, MoneyEntry } from '@/types/budget';
import { Plus } from 'lucide-react';

interface MoneyEntrySectionProps {
  title: string;
  /** Name suggestions for the combobox. Free text is always accepted. */
  categories: readonly string[];
  /** Used in the add row's labels, e.g. "expense" or "income stream". */
  noun: string;
  /**
   * Expenses run to twenty-odd rows and need two columns to stay above the
   * fold. Pay streams rarely pass three, where a second column reads as a
   * mistake.
   */
  singleColumn?: boolean;
  defaultFrequency?: Frequency;
  description?: string;
  emptyLabel: string;
  entries: MoneyEntry[];
  today: Date;
  weeklyTotal: number;
  onAdd: (name: string, amount: number, frequency: Frequency) => void;
  onUpdate: (id: string, patch: Partial<Omit<MoneyEntry, 'id'>>) => void;
  onRemove: (id: string) => void;
}

export function MoneyEntrySection({
  title,
  categories,
  noun,
  singleColumn = false,
  defaultFrequency = 'monthly',
  description,
  emptyLabel,
  entries,
  today,
  weeklyTotal,
  onAdd,
  onUpdate,
  onRemove,
}: MoneyEntrySectionProps) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<Frequency>(defaultFrequency);

  const handleAdd = () => {
    const parsedAmount = Number(amount);
    if (!name.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0) return;
    onAdd(name.trim(), parsedAmount, frequency);
    setName('');
    setAmount('');
  };

  return (
    <Card>
      <WidgetHeading
        title={title}
        description={description}
        trailing={
          <span className="shrink-0 text-sm font-normal tabular-nums text-muted-foreground">
            {formatCurrency(weeklyTotal)}/wk
          </span>
        }
      />

      <CardContent>
        {entries.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{emptyLabel}</p>
        ) : (
          /* Two columns from md up: a real budget runs past twenty categories,
             and a single column pushes most of them below the fold. The column
             rule stands in for the per-row separators a single list used. */
          <div
            className={
              singleColumn
                ? 'grid grid-cols-1'
                : 'grid grid-cols-1 gap-x-8 md:grid-cols-2 md:divide-x md:divide-border'
            }
          >
            {(singleColumn ? [0] : [0, 1]).map((column) => {
              const half = singleColumn ? entries.length : Math.ceil(entries.length / 2);
              const slice = column === 0 ? entries.slice(0, half) : entries.slice(half);
              if (slice.length === 0) return null;
              return (
                <div key={column} className={column === 1 ? 'md:pl-8' : undefined}>
                  {slice.map((entry, index) => (
                    <div key={entry.id}>
                      {index > 0 && <Separator />}
                      <MoneyEntryRow
                        entry={entry}
                        today={today}
                        categories={categories}
                        onUpdate={onUpdate}
                        onRemove={onRemove}
                      />
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <CardFooter className="flex-wrap gap-2">
        <CategoryCombobox
          value={name}
          onValueChange={setName}
          items={categories}
          placeholder="Name"
          aria-label={`New ${noun} name`}
          className="min-w-28 flex-1"
          onEnter={handleAdd}
        />
        <Input
          type="number"
          min="0"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount"
          className="w-24"
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <FrequencySelect
          value={frequency}
          onValueChange={setFrequency}
          aria-label={`How often the new ${noun} arrives`}
          className="w-24"
        />
        <Button size="sm" onClick={handleAdd}>
          <Plus className="size-4" />
          Add
        </Button>
      </CardFooter>
    </Card>
  );
}
