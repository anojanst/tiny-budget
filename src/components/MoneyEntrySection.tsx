import { useState } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Separator } from '@/components/ui/separator';
import { MoneyEntryRow } from '@/components/MoneyEntryRow';
import { WidgetHeading } from '@/components/WidgetHeading';
import { formatCurrency } from '@/lib/format';
import type { Frequency, MoneyEntry } from '@/types/budget';
import { Plus } from 'lucide-react';

interface MoneyEntrySectionProps {
  title: string;
  description?: string;
  emptyLabel: string;
  entries: MoneyEntry[];
  weeklyTotal: number;
  onAdd: (name: string, amount: number, frequency: Frequency) => void;
  onUpdate: (id: string, patch: Partial<Omit<MoneyEntry, 'id'>>) => void;
  onRemove: (id: string) => void;
}

export function MoneyEntrySection({
  title,
  description,
  emptyLabel,
  entries,
  weeklyTotal,
  onAdd,
  onUpdate,
  onRemove,
}: MoneyEntrySectionProps) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<Frequency>('monthly');

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
        {entries.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">{emptyLabel}</p>
        )}
        {entries.map((entry, index) => (
          <div key={entry.id}>
            {index > 0 && <Separator />}
            <MoneyEntryRow entry={entry} onUpdate={onUpdate} onRemove={onRemove} />
          </div>
        ))}
      </CardContent>

      <CardFooter className="flex-wrap gap-2">
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
