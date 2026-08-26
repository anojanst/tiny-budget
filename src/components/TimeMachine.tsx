import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { WidgetHeading } from '@/components/WidgetHeading';
import { formatCurrency } from '@/lib/format';
import { addMonths, formatShortDate, toDateInputValue } from '@/lib/dates';
import { cn } from '@/lib/utils';

const PRESETS = [
  { label: '1M', months: 1 },
  { label: '3M', months: 3 },
  { label: '6M', months: 6 },
  { label: '1Y', months: 12 },
];

interface TimeMachineProps {
  today: Date;
  dateValue: string;
  onDateChange: (value: string) => void;
  targetDate: Date | null;
  weeks: number;
  balance: number;
  goalAllocation: number;
  freeBalance: number;
}

export function TimeMachine({
  today,
  dateValue,
  onDateChange,
  targetDate,
  weeks,
  balance,
  goalAllocation,
  freeBalance,
}: TimeMachineProps) {
  const inDebt = balance < 0;
  // Distinct from actual debt: every dollar is accounted for, just not free
  // yet — it's on its way to a goal instead.
  const isFullyCommitted = !inDebt && freeBalance < 0.005 && goalAllocation > 0.005;

  return (
    <Card className="h-full">
      <WidgetHeading title="Time machine" description="Where you'd stand on a future date." />
      {/* Same "controls left, result right" grammar as Right Now: the dial
          you turn, and what it works out to. Per-goal detail now lives in the
          Goals widget itself, which is the surface it's actually edited on. */}
      <CardContent className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex shrink-0 flex-col gap-2 sm:w-60">
          <Input
            type="date"
            value={dateValue}
            min={toDateInputValue(today)}
            onChange={(e) => onDateChange(e.target.value)}
            className="w-full"
            aria-label="Travel to date"
          />
          <div className="flex gap-1.5">
            {PRESETS.map((preset) => {
              const isActive = dateValue === toDateInputValue(addMonths(today, preset.months));
              return (
                <Button
                  key={preset.label}
                  variant={isActive ? 'default' : 'outline'}
                  size="xs"
                  className="flex-1"
                  aria-pressed={isActive}
                  onClick={() => onDateChange(toDateInputValue(addMonths(today, preset.months)))}
                >
                  {preset.label}
                </Button>
              );
            })}
          </div>
        </div>

        <Separator orientation="vertical" className="hidden sm:block" />
        <Separator className="sm:hidden" />

        <div className="flex-1">
          <p className="text-xs text-muted-foreground">
            {targetDate ? (
              <>
                By {formatShortDate(targetDate)} · {Math.round(weeks)} weeks
              </>
            ) : (
              'Pick a date'
            )}
          </p>
          {/* Hero figure — what's actually free, not the raw total. The
              balance funds unmet goals first (instantly, same as the weekly
              leftover), so this reads $0 until every goal is fully funded. */}
          <p
            className={cn(
              'text-4xl font-semibold tracking-tight',
              inDebt ? 'text-destructive' : isFullyCommitted ? 'text-foreground' : 'text-primary',
            )}
          >
            {formatCurrency(Math.abs(inDebt ? balance : freeBalance))}
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {inDebt ? 'in debt' : 'free'}
            </span>
          </p>
          {/* Reconciles the hero with the Goals widget: the balance funds
              unmet goals first, same as the leftover, so it's only free once
              every goal is fully funded. */}
          {goalAllocation > 0.5 && (
            <p className="mt-1 text-xs text-muted-foreground">
              {formatCurrency(balance)} total · {formatCurrency(goalAllocation)} to goals — see Goals for per-goal detail
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
