import { useMemo, useState } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { GoalRow } from '@/components/GoalRow';
import { WidgetHeading, widgetCardClass } from '@/components/WidgetHeading';
import { cn } from '@/lib/utils';
import type { Goal } from '@/types/budget';
import type { GoalAtDate, GoalProgress } from '@/lib/budgetMath';
import { Plus, Target } from 'lucide-react';

interface GoalsSectionProps {
  goals: Goal[];
  goalProgressById: Map<string, GoalProgress>;
  /** Projected standing at the Time Machine's selected date, keyed by goal id. */
  projectionById: Map<string, GoalAtDate>;
  horizonLabel?: string;
  onAdd: (name: string, targetAmount: number, currentSaved: number, priority: number) => void;
  onUpdate: (id: string, patch: Partial<Omit<Goal, 'id'>>) => void;
  onRemove: (id: string) => void;
}

export function GoalsSection({
  goals,
  goalProgressById,
  projectionById,
  horizonLabel,
  onAdd,
  onUpdate,
  onRemove,
}: GoalsSectionProps) {
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [priority, setPriority] = useState('1');

  // Lower priority number first, so the order on screen matches who gets
  // funded first. Ties keep their original order (Array#sort is stable).
  const sortedGoals = useMemo(() => [...goals].sort((a, b) => a.priority - b.priority), [goals]);

  const tierSizeByPriority = useMemo(() => {
    const counts = new Map<number, number>();
    for (const goal of goals) counts.set(goal.priority, (counts.get(goal.priority) ?? 0) + 1);
    return counts;
  }, [goals]);

  const handleAdd = () => {
    const parsedTarget = Number(target);
    const parsedPriority = Math.max(1, Math.round(Number(priority)) || 1);
    if (!name.trim() || !Number.isFinite(parsedTarget) || parsedTarget <= 0) return;
    onAdd(name.trim(), parsedTarget, 0, parsedPriority);
    setName('');
    setTarget('');
    setPriority('1');
  };

  return (
    <Card className={cn('h-full', widgetCardClass('violet'))}>
      <WidgetHeading
        icon={Target}
        title="Goals"
        accent="violet"
        trailing={
          horizonLabel ? (
            <span className="shrink-0 text-xs font-normal text-muted-foreground">
              vs {horizonLabel}
            </span>
          ) : undefined
        }
      />

      <CardContent className="min-h-0 flex-1 overflow-y-auto">
        {goals.length === 0 && (
          <p className="text-sm text-muted-foreground">No goals yet — add one below.</p>
        )}
        {sortedGoals.map((goal, index) => {
          const progress = goalProgressById.get(goal.id);
          if (!progress) return null;
          return (
            <div key={goal.id}>
              {index > 0 && <Separator className="my-2" />}
              <GoalRow
                goal={goal}
                progress={progress}
                tierSize={tierSizeByPriority.get(goal.priority) ?? 1}
                projection={projectionById.get(goal.id)}
                horizonLabel={horizonLabel}
                onUpdate={onUpdate}
                onRemove={onRemove}
              />
            </div>
          );
        })}
      </CardContent>

      <CardFooter className="shrink-0 flex-wrap gap-2">
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
        <Button size="sm" onClick={handleAdd}>
          <Plus className="size-4" />
          Add Goal
        </Button>
      </CardFooter>
    </Card>
  );
}
