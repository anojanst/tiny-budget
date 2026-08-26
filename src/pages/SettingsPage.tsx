import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { PageHeader } from '@/components/shell/PageHeader';
import { WidgetHeading } from '@/components/WidgetHeading';
import { WEEKS_PER_MONTH } from '@/lib/budgetMath';

interface SettingsPageProps {
  onNewBudget: () => void;
  onRerunSetup: () => void;
}

export function SettingsPage({ onNewBudget, onRerunSetup }: SettingsPageProps) {
  return (
    <>
      <PageHeader title="Settings" subtitle="Your data, and how the numbers are worked out." />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <WidgetHeading title="Your data" description="Everything is stored in this browser." />
          <CardContent className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Run setup again</p>
                <p className="text-xs text-muted-foreground">
                  Walk back through the intake questions. Your data is kept.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={onRerunSetup}>
                Run setup
              </Button>
            </div>
            <Separator />
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Start a new budget</p>
                <p className="text-xs text-muted-foreground">
                  Clears your income, expenses, debts, and goals. This can't be undone.
                </p>
              </div>
              <Button variant="destructive" size="sm" onClick={onNewBudget}>
                Clear everything
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <WidgetHeading title="How this works" />
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">Everything is weekly.</span> Monthly
              amounts are divided by {WEEKS_PER_MONTH.toFixed(2)} weeks per month so one figure
              can be compared against another.
            </p>
            <p>
              <span className="font-medium text-foreground">Debts use the snowball.</span> They're
              ordered by balance, smallest first. You pay every minimum, and everything spare
              goes at the smallest. When it clears, its payment rolls into the next one — so the
              amount attacking your debt grows each time one disappears.
            </p>
            <p>
              <span className="font-medium text-foreground">Interest isn't asked for.</span> A
              minimum payment already covers its own interest, so each balance is simply paid
              down. That keeps the plan honest without making you hunt for a rate.
            </p>
            <p>
              <span className="font-medium text-foreground">Goals use priority.</span> The lowest
              number is funded first, and goals sharing a number split the money evenly.
            </p>
            <p>
              <span className="font-medium text-foreground">Nothing leaves this browser.</span> No
              account, no server, no tracking.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
