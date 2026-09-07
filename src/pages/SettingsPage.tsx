import { useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PageHeader } from '@/components/shell/PageHeader';
import { WidgetHeading } from '@/components/WidgetHeading';
import { Input } from '@/components/ui/input';
import type { NamedBudget } from '@/types/budget';
import { WEEKS_PER_MONTH } from '@/lib/budgetMath';
import { THEMES } from '@/lib/themes';
import { cn } from '@/lib/utils';
import { Check, Download, Plus, Trash2, Upload } from 'lucide-react';

interface SettingsPageProps {
  onNewBudget: () => void;
  onRerunSetup: () => void;
  themeId: string;
  onThemeChange: (id: string) => void;
  exportJson: () => string;
  importJson: (text: string) => string | null;
  budgets: NamedBudget[];
  activeBudgetId: string;
  onSwitchBudget: (id: string) => void;
  onCreateBudget: () => void;
  onRenameBudget: (id: string, name: string) => void;
  onDeleteBudget: (id: string) => void;
}

export function SettingsPage({
  onNewBudget,
  onRerunSetup,
  themeId,
  onThemeChange,
  exportJson,
  importJson,
  budgets,
  activeBudgetId,
  onSwitchBudget,
  onCreateBudget,
  onRenameBudget,
  onDeleteBudget,
}: SettingsPageProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importedSummary, setImportedSummary] = useState<string | null>(null);
  const [pendingImport, setPendingImport] = useState<string | null>(null);
  // The target outlives the open flag on purpose: clearing it on close would
  // blank the dialog's title to Delete "" for the length of the exit animation.
  const [deleteTarget, setDeleteTarget] = useState<NamedBudget | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const askDelete = (entry: NamedBudget) => {
    setDeleteTarget(entry);
    setDeleteOpen(true);
  };

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
    // Held until confirmed — it still changes which budget is selected.
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
    setImportedSummary('Imported as a new budget, and selected. Your others are unchanged.');
  };

  return (
    <>
      <PageHeader title="Settings" subtitle="Appearance, your data, and how the numbers work." />

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <WidgetHeading
            title="Budgets"
            description="Keep separate plans side by side — a household, a flat, a what-if. Only the selected one is shown across the app."
            trailing={
              <Button variant="outline" size="sm" onClick={onCreateBudget}>
                <Plus className="size-4" />
                New budget
              </Button>
            }
          />
          <CardContent>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
              {budgets.map((entry) => {
                const isActive = entry.id === activeBudgetId;
                return (
                  <div
                    key={entry.id}
                    className={cn(
                      'flex items-center gap-2 rounded-lg border p-2.5 transition-colors',
                      isActive ? 'border-primary/40 bg-accent/40' : 'border-border',
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => onSwitchBudget(entry.id)}
                      aria-pressed={isActive}
                      aria-label={`Switch to ${entry.name}`}
                      className="flex size-5 shrink-0 items-center justify-center rounded-full border border-border"
                    >
                      {isActive && <Check className="size-3 text-primary" />}
                    </button>
                    {/* Editable in place: renaming is the only thing anyone
                        does to a budget here often enough to deserve a field. */}
                    <Input
                      value={entry.name}
                      onChange={(e) => onRenameBudget(entry.id, e.target.value)}
                      aria-label={`Name of ${entry.name}`}
                      className="min-w-0 flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="shrink-0"
                      aria-label={`Delete ${entry.name}`}
                      onClick={() => askDelete(entry)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

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
                  Downloads the selected budget as a JSON file.
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
                  Opens the file as an additional budget. Nothing you already have is touched.
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
                <p className="text-sm font-medium">Empty this budget</p>
                <p className="text-xs text-muted-foreground">
                  Clears the selected budget's income, expenses, debts, and goals, keeping its
                  name. Your other budgets are untouched.
                </p>
              </div>
              <Button variant="destructive" size="sm" onClick={onNewBudget}>
                Empty it
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
        description="It opens as an additional budget and becomes the selected one. Nothing you already have is changed."
        confirmLabel="Import it"
        onConfirm={runImport}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete "${deleteTarget?.name ?? ''}"?`}
        description={
          budgets.length === 1
            ? "This is your only budget, so deleting it leaves you with a fresh empty one. It can't be undone."
            : "Its income, expenses, debts, and goals are removed for good. It can't be undone — export it first if you might want it back."
        }
        confirmLabel="Delete budget"
        destructive
        onConfirm={() => deleteTarget && onDeleteBudget(deleteTarget.id)}
      />
    </>
  );
}
