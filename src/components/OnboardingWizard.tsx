import { useState } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Debt, Frequency, Income, MoneyEntry } from '@/types/budget';
import { PiggyBank, X, ArrowLeft, ArrowRight, Check } from 'lucide-react';

/**
 * First-run intake. Landing straight on an empty dashboard leaves someone in
 * debt with no idea where to start, so this asks the four things the whole
 * model needs — income, cash, expenses, debts — one question at a time.
 */

const STEP_COUNT = 5;

interface OnboardingWizardProps {
  income: Income;
  onIncomeChange: (patch: Partial<Income>) => void;
  currentBalance: number;
  onCurrentBalanceChange: (amount: number) => void;
  expenses: MoneyEntry[];
  onAddExpense: (name: string, amount: number, frequency: Frequency) => void;
  onRemoveExpense: (id: string) => void;
  debts: Debt[];
  onAddDebt: (debt: Omit<Debt, 'id'>) => void;
  onRemoveDebt: (id: string) => void;
  onDone: () => void;
}

export function OnboardingWizard({
  income,
  onIncomeChange,
  currentBalance,
  onCurrentBalanceChange,
  expenses,
  onAddExpense,
  onRemoveExpense,
  debts,
  onAddDebt,
  onRemoveDebt,
  onDone,
}: OnboardingWizardProps) {
  const [step, setStep] = useState(0);
  const [debtFree, setDebtFree] = useState<boolean | null>(null);

  const [expenseName, setExpenseName] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseFrequency, setExpenseFrequency] = useState<Frequency>('monthly');

  const [debtName, setDebtName] = useState('');
  const [debtBalance, setDebtBalance] = useState('');
  const [debtMinimum, setDebtMinimum] = useState('');

  // Answering "yes, debt free" makes the debt step pointless — skip straight out.
  const isLastStep = step === STEP_COUNT - 1 || (step === 3 && debtFree === true);

  const handleAddExpense = () => {
    const amount = Number(expenseAmount);
    if (!expenseName.trim() || !Number.isFinite(amount) || amount <= 0) return;
    onAddExpense(expenseName.trim(), amount, expenseFrequency);
    setExpenseName('');
    setExpenseAmount('');
  };

  const handleAddDebt = () => {
    const balance = Number(debtBalance);
    if (!debtName.trim() || !Number.isFinite(balance) || balance <= 0) return;
    onAddDebt({
      name: debtName.trim(),
      balance,
      minimumPayment: Math.max(Number(debtMinimum) || 0, 0),
    });
    setDebtName('');
    setDebtBalance('');
    setDebtMinimum('');
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center p-4 lg:p-6">
      <div className="mb-6 flex items-center gap-2.5">
        <span
          aria-hidden
          className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground"
        >
          <PiggyBank className="size-5" />
        </span>
        <h1 className="text-2xl font-semibold tracking-tight">Tiny Budget</h1>
      </div>

      <Card>
        <CardContent className="flex min-h-64 flex-col gap-4 pt-6">
          {step === 0 && (
            <>
              <div>
                <h2 className="text-lg font-semibold">What does your household bring in?</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Take-home pay, after tax. Everything else is worked out from this.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={income.amount || ''}
                  onChange={(e) => onIncomeChange({ amount: e.target.valueAsNumber || 0 })}
                  placeholder="0.00"
                  className="w-36 text-lg"
                  autoFocus
                  aria-label="Household income"
                />
                <ToggleGroup
                  value={[income.frequency]}
                  onValueChange={(value) => {
                    if (value[0]) onIncomeChange({ frequency: value[0] as Frequency });
                  }}
                  variant="outline"
                >
                  <ToggleGroupItem value="weekly">Weekly</ToggleGroupItem>
                  <ToggleGroupItem value="monthly">Monthly</ToggleGroupItem>
                </ToggleGroup>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div>
                <h2 className="text-lg font-semibold">How much cash do you have right now?</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  What's in the bank today. It gets put to work immediately — against your
                  debts if you have any.
                </p>
              </div>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={currentBalance || ''}
                onChange={(e) => onCurrentBalanceChange(e.target.valueAsNumber || 0)}
                placeholder="0.00"
                className="w-36 text-lg"
                autoFocus
                aria-label="Cash on hand"
              />
            </>
          )}

          {step === 2 && (
            <>
              <div>
                <h2 className="text-lg font-semibold">What are your regular expenses?</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Rent, food, transport, bills. Rough numbers are fine — you can refine later.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Input
                  value={expenseName}
                  onChange={(e) => setExpenseName(e.target.value)}
                  placeholder="e.g. Rent"
                  className="min-w-28 flex-1"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddExpense()}
                />
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  placeholder="Amount"
                  className="w-24"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddExpense()}
                />
                <ToggleGroup
                  value={[expenseFrequency]}
                  onValueChange={(value) => {
                    if (value[0]) setExpenseFrequency(value[0] as Frequency);
                  }}
                  variant="outline"
                  size="sm"
                >
                  <ToggleGroupItem value="weekly">Weekly</ToggleGroupItem>
                  <ToggleGroupItem value="monthly">Monthly</ToggleGroupItem>
                </ToggleGroup>
                <Button size="sm" onClick={handleAddExpense}>
                  Add
                </Button>
              </div>
              {expenses.length > 0 && (
                <ul className="max-h-40 space-y-1 overflow-y-auto">
                  {expenses.map((entry) => (
                    <li key={entry.id} className="flex items-center gap-2 text-sm">
                      <span className="min-w-0 flex-1 truncate">{entry.name}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {formatCurrency(entry.amount)}/{entry.frequency === 'weekly' ? 'wk' : 'mo'}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Remove ${entry.name}`}
                        onClick={() => onRemoveExpense(entry.id)}
                      >
                        <X className="size-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}

          {step === 3 && (
            <>
              <div>
                <h2 className="text-lg font-semibold">Are you debt free?</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Credit cards, loans, car finance, money owed to family — all of it counts.
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  variant={debtFree === true ? 'default' : 'outline'}
                  className="flex-1"
                  aria-pressed={debtFree === true}
                  onClick={() => setDebtFree(true)}
                >
                  Yes, I'm debt free
                </Button>
                <Button
                  variant={debtFree === false ? 'default' : 'outline'}
                  className="flex-1"
                  aria-pressed={debtFree === false}
                  onClick={() => setDebtFree(false)}
                >
                  No, I have debt
                </Button>
              </div>
              {debtFree === false && (
                <p className="text-sm text-muted-foreground">
                  We'll use the debt snowball: smallest balance first, every spare dollar at
                  it, then roll that payment into the next one.
                </p>
              )}
              {debtFree === true && (
                <p className="text-sm text-muted-foreground">
                  Then it's all about savings goals. Let's get you to the dashboard.
                </p>
              )}
            </>
          )}

          {step === 4 && (
            <>
              <div>
                <h2 className="text-lg font-semibold">List your debts</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  What you owe, and the least you must pay each week. If there's no set
                  minimum — money from family, say — leave it at zero.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Input
                  value={debtName}
                  onChange={(e) => setDebtName(e.target.value)}
                  placeholder="e.g. Visa"
                  className="min-w-28 flex-1"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddDebt()}
                />
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={debtBalance}
                  onChange={(e) => setDebtBalance(e.target.value)}
                  placeholder="Balance"
                  className="w-28"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddDebt()}
                />
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={debtMinimum}
                  onChange={(e) => setDebtMinimum(e.target.value)}
                  placeholder="Min/wk"
                  className="w-24"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddDebt()}
                />
                <Button size="sm" onClick={handleAddDebt}>
                  Add
                </Button>
              </div>
              {debts.length > 0 && (
                <ul className="max-h-40 space-y-1 overflow-y-auto">
                  {debts.map((debt) => (
                    <li key={debt.id} className="flex items-center gap-2 text-sm">
                      <span className="min-w-0 flex-1 truncate">{debt.name}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {formatCurrency(debt.balance)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Remove ${debt.name}`}
                        onClick={() => onRemoveDebt(debt.id)}
                      >
                        <X className="size-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </CardContent>

        <Separator />

        <CardFooter className="flex items-center justify-between gap-2 pt-4">
          <div className="flex items-center gap-1.5" aria-hidden>
            {Array.from({ length: STEP_COUNT }, (_, i) => (
              <span
                key={i}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  i === step ? 'w-5 bg-primary' : 'w-1.5 bg-border',
                )}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onDone}>
              Skip setup
            </Button>
            {step > 0 && (
              <Button variant="outline" size="sm" onClick={() => setStep((s) => s - 1)}>
                <ArrowLeft className="size-4" />
                Back
              </Button>
            )}
            <Button
              size="sm"
              disabled={step === 3 && debtFree === null}
              onClick={() => (isLastStep ? onDone() : setStep((s) => s + 1))}
            >
              {isLastStep ? (
                <>
                  <Check className="size-4" />
                  Finish
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
