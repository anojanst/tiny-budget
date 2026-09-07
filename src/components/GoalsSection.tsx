import { useMemo, useState } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { GoalRow } from '@/components/GoalRow';
import { WidgetHeading } from '@/components/WidgetHeading';
import type { Goal } from '@/types/budget';
import type { GoalAtDate, GoalProgress } from '@/lib/budgetMath';
import { Plus } from 'lucide-react';

interface GoalsSectionProps {
  goals: Goal[];
  goalProgressById: Map<string, GoalProgress>;
  /** Projected standing at the Time Machine's selected date, keyed by goal id. */
  projectionById: Map<string, GoalAtDate>;
  horizonLabel?: string;
  /** Drives the "why isn't this moving" copy, which differs while in debt. */
  hasDebts: boolean;
  goalStartWeek: number | null;
  today: Date;
  onAdd: (
    name: string,
    targetAmount: number,
    currentSaved: number,
    priority: number,
    targetDate?: string,
  ) => void;
  onPrioritise: (id: string) => void;
  onUpdate: (id: string, patch: Partial<Omit<Goal, 'id'>>) => void;
  onRemove: (id: string) => void;
}

export function GoalsSection({
  goals,
  goalProgressById,
  projectionById,
  horizonLabel,
  hasDebts,
  goalStartWeek,
  today,
  onAdd,
  onPrioritise,
  onUpdate,
  onRemove,
}: GoalsSectionProps) {
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [priority, setPriority] = useState('1');
  const [dueDate, setDueDate] = useState('');

  // Lower priority number first, so the order on screen matches who gets
  // funded first. Ties keep their original order (Array#sort is stable).
  const sortedGoals = useMemo(() => [...goals].sort((a, b) => a.priority - b.priority), [goals]);

  const tierSizeByPriority = useMemo(() => {
    const counts = new Map<number, number>();
    for (const goal of goals) counts.set(goal.priority, (counts.get(goal.priority) ?? 0) + 1);
    return counts;
  }, [goals]);

  // While in debt, "earn more" is the wrong advice — the money exists, it's
  // just all committed to the snowball on purpose until the debts are gone.
  const unreachableHint =
    hasDebts && goalStartWeek === null
      ? "Your debts aren't being paid off, so nothing will ever reach this. Fix that on the Debts page."
      : 'Increase income or reduce expenses to make progress on this goal.';

  const handleAdd = () => {
    const parsedTarget = Number(target);
    const parsedPriority = Math.max(1, Math.round(Number(priority)) || 1);
    if (!name.trim() || !Number.isFinite(parsedTarget) || parsedTarget <= 0) return;
    onAdd(name.trim(), parsedTarget, 0, parsedPriority, dueDate || undefined);
    setName('');
    setTarget('');
    setPriority('1');
    setDueDate('');
  };

  return (
    <Card>
      <WidgetHeading
        title="Savings goals"
        description={
          hasDebts
            ? 'Funded after your debts are cleared. Lower priority number goes first; goals sharing a number split the money evenly.'
            : 'Lower priority number is funded first. Goals sharing a number split the money evenly.'
        }
        trailing={
          horizonLabel ? (
            <span className="shrink-0 text-xs font-normal text-muted-foreground">
              vs {horizonLabel}
            </span>
          ) : undefined
        }
      />

      <CardContent>
        {goals.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No goals yet — add one below.
          </p>
        ) : (
          /* Up to three per row, same as the debt tiles: both lists are short
             cards read at a glance, and one column wastes the width. */
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {sortedGoals.map((goal) => {
              const progress = goalProgressById.get(goal.id);
              if (!progress) return null;
              return (
                <GoalRow
                  key={goal.id}
                  goal={goal}
                  progress={progress}
                  tierSize={tierSizeByPriority.get(goal.priority) ?? 1}
                  projection={projectionById.get(goal.id)}
                  horizonLabel={horizonLabel}
                  unreachableHint={unreachableHint}
                  today={today}
                  onPrioritise={onPrioritise}
                  onUpdate={onUpdate}
                  onRemove={onRemove}
                />
              );
            })}
          </div>
        )}
      </CardContent>

      <CardFooter className="flex-wrap gap-2">
        <div className="relative w-14 shrink-0" title="Priority — lower number is funded first">
          <span className="pointer-events-none absolute inset-y-0 left-2 flex items-center text-xs text-muted-foreground">
            #
          </span>
          <Input
            type="number"
            min="1"
            step="1"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            aria-label="Priority — lower number is funded first"
            className="pl-5"
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
        </div>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Goal name"
          className="min-w-28 flex-1"
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <Input
          type="number"
          min="0"
          step="0.01"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          placeholder="Target amount"
          className="w-32"
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <Input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          aria-label="Needed by (optional)"
          title="Needed by (optional)"
          className="w-40"
        />
        <Button size="sm" onClick={handleAdd}>
          <Plus className="size-4" />
          Add goal
        </Button>
      </CardFooter>
    </Card>
  );
}
