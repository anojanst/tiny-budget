import { useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PageHeader } from '@/components/shell/PageHeader';
import { WidgetHeading } from '@/components/WidgetHeading';
import { WEEKS_PER_MONTH } from '@/lib/budgetMath';
import { THEMES } from '@/lib/themes';
import { cn } from '@/lib/utils';
import { Check, Download, Upload } from 'lucide-react';

interface SettingsPageProps {
  onNewBudget: () => void;
  onRerunSetup: () => void;
  themeId: string;
  onThemeChange: (id: string) => void;
  exportJson: () => string;
  importJson: (text: string) => string | null;
}

export function SettingsPage({
  onNewBudget,
  onRerunSetup,
  themeId,
  onThemeChange,
  exportJson,
  importJson,
}: SettingsPageProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importedSummary, setImportedSummary] = useState<string | null>(null);
  const [pendingImport, setPendingImport] = useState<string | null>(null);

  const handleExport = () => {
    const blob = new Blob([exportJson()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tiny-budget-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    // Revoking immediately can cancel the download in some browsers.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setImportError(null);
    setImportedSummary(null);
    const text = await file.text();
    // Held until confirmed: importing replaces everything already entered.
    setPendingImport(text);
  };

  const runImport = () => {
    if (pendingImport === null) return;
    const error = importJson(pendingImport);
    setPendingImport(null);
    if (error) {
      setImportError(error);
      return;
    }
    setImportedSummary('Budget imported. Everything on the other pages now reflects that file.');
  };

  return (
    <>
      <PageHeader title="Settings" subtitle="Appearance, your data, and how the numbers work." />

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <Card>
          <WidgetHeading title="Theme" description="Sets the accent used across the app." />
          <CardContent>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {THEMES.map((theme) => {
                const isActive = theme.id === themeId;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => onThemeChange(theme.id)}
                    aria-pressed={isActive}
                    className={cn(
                      'flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-colors',
                      isActive
                        ? 'border-primary bg-accent font-medium text-accent-foreground'
                        : 'border-border hover:bg-muted',
                    )}
                  >
                    <span
                      aria-hidden
                      className="flex size-5 shrink-0 items-center justify-center rounded-full"
                      style={{ background: theme.primary }}
                    >
                      {isActive && <Check className="size-3 text-white" />}
                    </span>
                    <span className="min-w-0 truncate">{theme.label}</span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <WidgetHeading
            title="Your data"
            description="Everything is stored in this browser. Back it up, or move it to another one."
          />
          <CardContent className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Export a backup</p>
                <p className="text-xs text-muted-foreground">
                  Downloads a JSON file with your income, expenses, debts, and goals.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="size-4" />
                Export
              </Button>
            </div>

            <Separator />

            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Import a backup</p>
                <p className="text-xs text-muted-foreground">
                  Replaces everything currently in this browser. Older exports still work.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                <Upload className="size-4" />
                Import
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                aria-label="Choose a backup file to import"
                onChange={(e) => {
                  void handleFile(e.target.files?.[0]);
                  // Reset so choosing the same file twice still fires.
                  e.target.value = '';
                }}
              />
            </div>

            {importError && (
              <Alert variant="destructive">
                <AlertDescription>{importError}</AlertDescription>
              </Alert>
            )}
            {importedSummary && (
              <Alert>
                <AlertDescription>{importedSummary}</AlertDescription>
              </Alert>
            )}

            <Separator />

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

        <Card className="lg:col-span-2">
          <WidgetHeading title="How this works" />
          <CardContent className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
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
              <span className="font-medium text-foreground">Goals come after debt.</span> While
              you owe money every spare dollar attacks it. Once the last debt is gone, the whole
              weekly leftover funds your goals, lowest priority number first.
            </p>
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={pendingImport !== null}
        onOpenChange={(open) => !open && setPendingImport(null)}
        title="Import this backup?"
        description="This replaces the income, expenses, debts, and goals currently in this browser. It can't be undone — export a backup first if you want to keep them."
        confirmLabel="Replace my budget"
        destructive
        onConfirm={runImport}
      />
    </>
  );
}
