import { useState } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Separator } from '@/components/ui/separator';
import { MoneyEntryRow } from '@/components/MoneyEntryRow';
import { WidgetHeading, widgetCardClass, type WidgetAccent } from '@/components/WidgetHeading';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Frequency, MoneyEntry } from '@/types/budget';
import { Plus, type LucideIcon } from 'lucide-react';

interface MoneyEntrySectionProps {
  title: string;
  icon: LucideIcon;
  accent: WidgetAccent;
  emptyLabel: string;
  entries: MoneyEntry[];
  weeklyTotal: number;
  onAdd: (name: string, amount: number, frequency: Frequency) => void;
  onUpdate: (id: string, patch: Partial<Omit<MoneyEntry, 'id'>>) => void;
  onRemove: (id: string) => void;
}

export function MoneyEntrySection({
  title,
  icon,
  accent,
  emptyLabel,
  entries,
  weeklyTotal,
  onAdd,
  onUpdate,
  onRemove,
}: MoneyEntrySectionProps) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<Frequency>('weekly');

  const handleAdd = () => {
    const parsedAmount = Number(amount);
    if (!name.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0) return;
    onAdd(name.trim(), parsedAmount, frequency);
    setName('');
    setAmount('');
    setFrequency('weekly');
  };

  return (
    <Card className={cn('h-full', widgetCardClass(accent))}>
      <WidgetHeading
        icon={icon}
        title={title}
        accent={accent}
        trailing={
          <span className="shrink-0 text-sm font-normal tabular-nums text-muted-foreground">
            {formatCurrency(weeklyTotal)}/wk
          </span>
        }
      />

      {/* The list is the only part allowed to grow; it scrolls inside the card so
          the page itself never does. */}
      <CardContent className="min-h-0 flex-1 overflow-y-auto">
        {entries.length === 0 && <p className="text-sm text-muted-foreground">{emptyLabel}</p>}
        {entries.map((entry, index) => (
          <div key={entry.id}>
            {index > 0 && <Separator />}
            <MoneyEntryRow entry={entry} onUpdate={onUpdate} onRemove={onRemove} />
          </div>
        ))}
      </CardContent>

      {/* Pinned so adding an entry never requires scrolling to find the form. */}
      <CardFooter className="shrink-0 flex-wrap gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          className="min-w-28 flex-1"
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
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
        <ToggleGroup
          value={[frequency]}
          onValueChange={(value) => {
            if (value[0]) setFrequency(value[0] as Frequency);
          }}
          variant="outline"
          size="sm"
        >
          <ToggleGroupItem value="weekly">Weekly</ToggleGroupItem>
          <ToggleGroupItem value="monthly">Monthly</ToggleGroupItem>
        </ToggleGroup>
        <Button size="sm" onClick={handleAdd}>
          <Plus className="size-4" />
          Add
        </Button>
      </CardFooter>
    </Card>
  );
}
