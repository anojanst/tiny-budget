import { useState } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { WidgetHeading } from '@/components/WidgetHeading';
import { formatCurrency } from '@/lib/format';
import { formatShortDate, parseLocalDate, toDateInputValue } from '@/lib/dates';
import { cn } from '@/lib/utils';
import type { OneOff, OneOffDirection } from '@/types/budget';
import { Plus, X } from 'lucide-react';

/**
 * Two mutually exclusive choices, shown side by side rather than hidden behind
 * a dropdown: which way the money goes changes how the whole row reads, so it
 * should be legible without opening anything.
 */
function DirectionToggle({
  value,
  onChange,
  label,
}: {
  value: OneOffDirection;
  onChange: (next: OneOffDirection) => void;
  label: string;
}) {
  const options: { value: OneOffDirection; text: string }[] = [
    { value: 'out', text: 'Out' },
    { value: 'in', text: 'In' },
  ];
  return (
    <div
      role="group"
      aria-label={label}
      className="flex h-8 shrink-0 overflow-hidden rounded-lg border border-input"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'w-9 text-xs font-medium transition-colors',
            value === option.value
              ? option.value === 'in'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-foreground'
              : 'text-muted-foreground hover:bg-muted/60',
          )}
        >
          {option.text}
        </button>
      ))}
    </div>
  );
}

interface OneOffSectionProps {
  oneOffs: OneOff[];
  today: Date;
  onAdd: (name: string, amount: number, date: string, direction: OneOffDirection) => void;
  onUpdate: (id: string, patch: Partial<Omit<OneOff, 'id'>>) => void;
  onRemove: (id: string) => void;
}

/**
 * Planned single payments — a headphone this month, a flight in March.
 *
 * These live on the calendar rather than with the expenses because they have
 * no weekly rate to sit alongside: charging a one-off purchase against every
 * week from now on would understate what's spare forever. A date and an
 * amount is the whole of it.
 */
export function OneOffSection({ oneOffs, today, onAdd, onUpdate, onRemove }: OneOffSectionProps) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [direction, setDirection] = useState<OneOffDirection>('out');

  const handleAdd = () => {
    const parsed = Number(amount);
    if (!name.trim() || !Number.isFinite(parsed) || parsed <= 0 || !date) return;
    onAdd(name.trim(), parsed, date, direction);
    setName('');
    setAmount('');
    setDate('');
  };

  // Past ones are kept, but they no longer come off the projection — the cash
  // they took is already inside today's balance.
  const upcoming = oneOffs.filter((item) => {
    const when = parseLocalDate(item.date);
    return when !== null && when.getTime() >= today.getTime();
  });
  // Shown as two figures rather than one net number: "$350 out, $1,200 in"
  // says something a single "+$850" hides.
  const totalOut = upcoming
    .filter((item) => item.direction !== 'in')
    .reduce((sum, item) => sum + item.amount, 0);
  const totalIn = upcoming
    .filter((item) => item.direction === 'in')
    .reduce((sum, item) => sum + item.amount, 0);

  const sorted = [...oneOffs].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <Card>
      <WidgetHeading
        title="One-offs"
        description="Single dated payments and windfalls. Not recurring, not saved up for."
        trailing={
          <span className="shrink-0 text-sm font-normal tabular-nums text-muted-foreground">
            {totalOut > 0 && `${formatCurrency(totalOut)} out`}
            {totalOut > 0 && totalIn > 0 && ' · '}
            {totalIn > 0 && <span className="text-primary">{formatCurrency(totalIn)} in</span>}
            {totalOut === 0 && totalIn === 0 && 'Nothing coming'}
          </span>
        }
      />
      <CardContent>
        {sorted.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">
            Nothing planned. Add a purchase or a windfall — a refund, a bonus, something
            sold — and the calendar will show what it leaves you with.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {sorted.map((item) => {
              const when = parseLocalDate(item.date);
              const past = when !== null && when.getTime() < today.getTime();
              return (
                <div
                  key={item.id}
                  className={cn('flex flex-wrap items-center gap-1.5 py-1', past && 'opacity-60')}
                >
                  <Input
                    value={item.name}
                    onChange={(e) => onUpdate(item.id, { name: e.target.value })}
                    placeholder="What is it"
                    aria-label="One-off name"
                    className="min-w-0 basis-full sm:basis-0 sm:flex-1"
                  />
                  <DirectionToggle
                    value={item.direction}
                    onChange={(next) => onUpdate(item.id, { direction: next })}
                    label={`${item.name || 'One-off'} direction`}
                  />
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.amount}
                    onChange={(e) => onUpdate(item.id, { amount: e.target.valueAsNumber || 0 })}
                    aria-label={`${item.name || 'One-off'} amount`}
                    className="w-24 shrink-0 sm:flex-none"
                  />
                  <Input
                    type="date"
                    value={item.date}
                    onChange={(e) => onUpdate(item.id, { date: e.target.value })}
                    aria-label={`${item.name || 'One-off'} date`}
                    className="min-w-0 flex-1 shrink-0 sm:w-[8.75rem] sm:flex-none"
                  />
                  <span className="hidden w-24 shrink-0 text-right text-xs text-muted-foreground sm:block">
                    {past ? 'Already paid' : when ? formatShortDate(when) : ''}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="shrink-0"
                    aria-label={`Remove ${item.name || 'one-off'}`}
                    onClick={() => onRemove(item.id)}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
      <Separator />
      <CardFooter className="flex-wrap gap-1.5 pt-3">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder={direction === 'in' ? 'Tax refund' : 'Headphones'}
          aria-label="New one-off name"
          className="min-w-0 basis-full sm:basis-0 sm:flex-1"
        />
        <DirectionToggle value={direction} onChange={setDirection} label="New one-off direction" />
        <Input
          type="number"
          min="0"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="Amount"
          aria-label="New one-off amount"
          className="w-24 shrink-0"
        />
        <Input
          type="date"
          value={date}
          min={toDateInputValue(today)}
          onChange={(e) => setDate(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          aria-label="New one-off date"
          className="min-w-0 flex-1 shrink-0 sm:w-[8.75rem] sm:flex-none"
        />
        <Button onClick={handleAdd} size="sm" className="shrink-0">
          <Plus className="size-4" />
          Add
        </Button>
      </CardFooter>
    </Card>
  );
}
