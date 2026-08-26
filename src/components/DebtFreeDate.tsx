import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { WidgetHeading } from '@/components/WidgetHeading';
import { formatCurrency } from '@/lib/format';
import { addWeeks, formatShortDate } from '@/lib/dates';
import { cn } from '@/lib/utils';
import type { SnowballResult } from '@/lib/debtMath';
import { PartyPopper } from 'lucide-react';

interface DebtFreeDateProps {
  snowball: SnowballResult;
  today: Date;
  totalOwed: number;
  /** Positive when weekly leftover can't cover the combined minimums. */
  budgetShortfall: number;
}

export function DebtFreeDate({ snowball, today, totalOwed, budgetShortfall }: DebtFreeDateProps) {
  const { debtFreeWeek, totalInterest } = snowball;
  const stalled = debtFreeWeek === null;
  const freeDate = debtFreeWeek !== null ? addWeeks(today, debtFreeWeek) : null;

  return (
    <Card
      className={cn(
        // Same glass treatment as SummaryPanel: every stop needs its own
        // translucency or tailwind-merge drops the card's own bg.
        'h-full border-l-4 bg-gradient-to-r',
        stalled
          ? 'border-l-rose-500 from-rose-500/20 via-card/40 to-card/40 dark:border-l-rose-400 dark:from-rose-500/15 dark:via-card/25 dark:to-card/25'
          : 'border-l-emerald-500 from-rose-500/20 via-card/40 to-emerald-500/20 dark:border-l-emerald-400 dark:from-rose-500/15 dark:via-card/25 dark:to-emerald-500/15',
      )}
    >
      <WidgetHeading icon={PartyPopper} title="Debt free" accent="emerald" />
      <CardContent className="flex flex-1 flex-col justify-center gap-4">
        <div className="flex flex-wrap items-start gap-x-8 gap-y-4">
          <div className="shrink-0">
            <p className="text-xs text-muted-foreground">You owe</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{formatCurrency(totalOwed)}</p>
          </div>

          <div className="shrink-0">
            <p className="text-xs text-muted-foreground">Interest ahead</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">
              {stalled ? '—' : formatCurrency(totalInterest)}
            </p>
          </div>

          <Separator orientation="vertical" className="hidden self-stretch sm:block" />

          {/* Hero figure — the whole point of the app for someone in debt. */}
          <div className="shrink-0">
            <p className="text-xs text-muted-foreground">
              {stalled ? 'Not on track' : 'Debt free on'}
            </p>
            <p
              className={cn(
                'text-4xl font-semibold tracking-tight',
                stalled ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400',
              )}
            >
              {freeDate ? formatShortDate(freeDate) : 'Never'}
            </p>
            {debtFreeWeek !== null && debtFreeWeek > 0 && (
              <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                {debtFreeWeek} weeks · {formatCurrency(snowball.totalPaid)} paid in total
              </p>
            )}
          </div>
        </div>

        {budgetShortfall > 0 && (
          <Alert variant="destructive">
            <AlertDescription>
              You're {formatCurrency(budgetShortfall)}/wk short of your minimum payments. Cut
              expenses or raise income — until then this plan assumes money that isn't there.
            </AlertDescription>
          </Alert>
        )}

        {stalled && budgetShortfall === 0 && (
          <Alert variant="destructive">
            <AlertDescription>
              At least one debt is growing faster than you're paying it. Raise its payment to
              start making progress.
            </AlertDescription>
          </Alert>
        )}

        {!stalled && debtFreeWeek === 0 && (
          <p className="text-xs text-muted-foreground">
            Your cash on hand clears everything — you're debt free today.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
