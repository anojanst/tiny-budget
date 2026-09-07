import { useState } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { WidgetHeading } from '@/components/WidgetHeading';
import { formatCurrency } from '@/lib/format';
import { formatShortDate, parseLocalDate, toDateInputValue } from '@/lib/dates';
import { cn } from '@/lib/utils';
import type { OneOff } from '@/types/budget';
import { Plus, X } from 'lucide-react';

interface OneOffSectionProps {
  oneOffs: OneOff[];
  today: Date;
  onAdd: (name: string, amount: number, date: string) => void;
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

  const handleAdd = () => {
    const parsed = Number(amount);
    if (!name.trim() || !Number.isFinite(parsed) || parsed <= 0 || !date) return;
    onAdd(name.trim(), parsed, date);
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
  const upcomingTotal = upcoming.reduce((sum, item) => sum + item.amount, 0);

  const sorted = [...oneOffs].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <Card>
      <WidgetHeading
        title="One-off payments"
        description="Single purchases with a date. Not saved up for, not recurring."
        trailing={
          <span className="shrink-0 text-sm font-normal tabular-nums text-muted-foreground">
            {formatCurrency(upcomingTotal)} coming
          </span>
        }
      />
      <CardContent>
        {sorted.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">
            Nothing planned. Add a purchase and the calendar will show what it leaves you with.
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
          placeholder="Headphones"
          aria-label="New one-off name"
          className="min-w-0 basis-full sm:basis-0 sm:flex-1"
        />
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
