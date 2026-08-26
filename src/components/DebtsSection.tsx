import { useState } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DebtRow } from '@/components/DebtRow';
import { WidgetHeading } from '@/components/WidgetHeading';
import { formatCurrency } from '@/lib/format';
import type { Debt } from '@/types/budget';
import type { SnowballResult } from '@/lib/debtMath';
import { activeDebtId } from '@/lib/debtMath';
import { Plus } from 'lucide-react';

interface DebtsSectionProps {
  debts: Debt[];
  snowball: SnowballResult;
  debtMinimums: number;
  onAdd: (debt: Omit<Debt, 'id'>) => void;
  onUpdate: (id: string, patch: Partial<Omit<Debt, 'id'>>) => void;
  onRemove: (id: string) => void;
}

export function DebtsSection({
  debts,
  snowball,
  debtMinimums,
  onAdd,
  onUpdate,
  onRemove,
}: DebtsSectionProps) {
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');
  const [minimum, setMinimum] = useState('');

  const active = activeDebtId(debts);

  const handleAdd = () => {
    const parsedBalance = Number(balance);
    if (!name.trim() || !Number.isFinite(parsedBalance) || parsedBalance <= 0) return;
    onAdd({
      name: name.trim(),
      balance: parsedBalance,
      minimumPayment: Math.max(Number(minimum) || 0, 0),
    });
    setName('');
    setBalance('');
    setMinimum('');
  };

  return (
    <Card>
      <WidgetHeading
        title="Your debts"
        description="Smallest balance first. Every spare dollar hits the top one until it's gone, then rolls into the next."
        trailing={
          <span className="shrink-0 text-sm font-normal tabular-nums text-muted-foreground">
            {formatCurrency(debtMinimums)}/wk min
          </span>
        }
      />

      <CardContent>
        {debts.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No debts listed — you're debt free. Add one below if that changes.
          </p>
        ) : (
          /* Up to three per row: the tiles are only two fields wide, so a
             single column wastes most of the available width. */
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {snowball.order.map((debt, index) => (
              <DebtRow
                key={debt.id}
                debt={debt}
                position={index + 1}
                outcome={snowball.outcomeById.get(debt.id)}
                isActive={debt.id === active}
                onUpdate={onUpdate}
                onRemove={onRemove}
              />
            ))}
          </div>
        )}
      </CardContent>

      <CardFooter className="flex-wrap gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Debt name"
          className="min-w-28 flex-1"
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <Input
          type="number"
          min="0"
          step="0.01"
          value={balance}
          onChange={(e) => setBalance(e.target.value)}
          placeholder="Balance"
          className="w-28"
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <Input
          type="number"
          min="0"
          step="0.01"
          value={minimum}
          onChange={(e) => setMinimum(e.target.value)}
          placeholder="Min/wk"
          className="w-24"
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <Button size="sm" onClick={handleAdd}>
          <Plus className="size-4" />
          Add debt
        </Button>
      </CardFooter>
    </Card>
  );
}
