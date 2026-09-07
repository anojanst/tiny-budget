import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { CategoryCombobox } from '@/components/ui/category-combobox';
import { FrequencySelect } from '@/components/ui/frequency-select';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/lib/expenseCategories';
import { formatCurrency } from '@/lib/format';
import { toWeeklyAmount } from '@/lib/budgetMath';
import { toDateInputValue } from '@/lib/dates';
import { cn } from '@/lib/utils';
import type { Frequency, IncomeStream, MoneyEntry } from '@/types/budget';
import { ArrowRight, PiggyBank, Plus, X } from 'lucide-react';

interface OnboardingWizardProps {
  incomes: IncomeStream[];
  onAddIncome: (name: string, amount: number, frequency: Frequency) => void;
  onUpdateIncome: (id: string, patch: Partial<Omit<IncomeStream, 'id'>>) => void;
  onRemoveIncome: (id: string) => void;
  currentBalance: number;
  onCurrentBalanceChange: (amount: number) => void;
  expenses: MoneyEntry[];
  onAddExpense: (name: string, amount: number, frequency: Frequency) => void;
  onRemoveExpense: (id: string) => void;
  today: Date;
  onDone: () => void;
}

const STEPS = ['Income', 'Cash', 'Payments'] as const;

/**
 * Three questions, in the order the calendar needs them: what comes in and
 * when, what's in the account today, and what goes out.
 *
 * The payday matters more here than anywhere else in setup — without it the
 * calendar can only spread income at an average rate, which is the difference
 * between "you're fine" and "you're short on the 14th".
 */
export function OnboardingWizard({
  incomes,
  onAddIncome,
  onUpdateIncome,
  onRemoveIncome,
  currentBalance,
  onCurrentBalanceChange,
  expenses,
  onAddExpense,
  onRemoveExpense,
  today,
  onDone,
}: OnboardingWizardProps) {
  const [step, setStep] = useState(0);

  const [incomeName, setIncomeName] = useState('Salary');
  const [incomeAmount, setIncomeAmount] = useState('');
  const [incomeFrequency, setIncomeFrequency] = useState<Frequency>('fortnightly');

  const [expenseName, setExpenseName] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseFrequency, setExpenseFrequency] = useState<Frequency>('monthly');

  const addIncome = () => {
    const amount = Number(incomeAmount);
    if (!incomeName.trim() || !Number.isFinite(amount) || amount <= 0) return;
    onAddIncome(incomeName.trim(), amount, incomeFrequency);
    setIncomeName('');
    setIncomeAmount('');
  };

  const addExpense = () => {
    const amount = Number(expenseAmount);
    if (!expenseName.trim() || !Number.isFinite(amount) || amount <= 0) return;
    onAddExpense(expenseName.trim(), amount, expenseFrequency);
    setExpenseName('');
    setExpenseAmount('');
  };

  const isLast = step === STEPS.length - 1;

  return (
    <div className="flex min-h-dvh items-center justify-center px-5 py-10">
      <div className="w-full max-w-xl">
        <div className="mb-6 flex items-center gap-2.5">
          <span
            aria-hidden
            className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground"
          >
            <PiggyBank className="size-5" />
          </span>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Tiny Budget</h1>
            <p className="text-sm text-muted-foreground">
              A calendar of what lands when, and what it leaves you.
            </p>
          </div>
        </div>

        <div className="mb-4 flex gap-1.5" aria-hidden>
          {STEPS.map((label, index) => (
            <span
              key={label}
              className={cn(
                'h-1 flex-1 rounded-full transition-colors',
                index <= step ? 'bg-primary' : 'bg-border',
              )}
            />
          ))}
        </div>

        <Card>
          <CardContent className="space-y-4">
            {step === 0 && (
              <>
                <div>
                  <h2 className="text-base font-semibold">What comes in?</h2>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    Add every pay stream — two jobs, a partner's wage, a rental. You can set
                    paydays next.
                  </p>
                </div>

                {incomes.length > 0 && (
                  <div className="divide-y divide-border">
                    {incomes.map((stream) => (
                      <div key={stream.id} className="flex flex-wrap items-center gap-2 py-2">
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">
                          {stream.name}
                        </span>
                        <span className="text-sm tabular-nums text-muted-foreground">
                          {formatCurrency(toWeeklyAmount(stream.amount, stream.frequency))}/wk
                        </span>
                        <label className="flex items-center gap-1 text-xs text-muted-foreground">
                          Next payday
                          <Input
                            type="date"
                            min={toDateInputValue(today)}
                            value={stream.nextDue ?? ''}
                            onChange={(e) =>
                              onUpdateIncome(stream.id, { nextDue: e.target.value || undefined })
                            }
                            aria-label={`${stream.name} next payday`}
                            className="h-7 w-[8.5rem] px-1.5 text-xs"
                          />
                        </label>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Remove ${stream.name}`}
                          onClick={() => onRemoveIncome(stream.id)}
                        >
                          <X className="size-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <Separator />
                <div className="flex flex-wrap gap-2">
                  <CategoryCombobox
                    value={incomeName}
                    onValueChange={setIncomeName}
                    items={INCOME_CATEGORIES}
                    placeholder="Salary"
                    aria-label="Income name"
                    className="min-w-28 flex-1"
                    onEnter={addIncome}
                  />
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={incomeAmount}
                    onChange={(e) => setIncomeAmount(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addIncome()}
                    placeholder="Amount"
                    aria-label="Income amount"
                    className="w-28"
                  />
                  <FrequencySelect
                    value={incomeFrequency}
                    onValueChange={setIncomeFrequency}
                    aria-label="How often you are paid"
                    className="w-24"
                  />
                  <Button size="sm" onClick={addIncome}>
                    <Plus className="size-4" />
                    Add
                  </Button>
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <div>
                  <h2 className="text-base font-semibold">What's in the account?</h2>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    Today's balance. Every figure on the calendar is this plus everything that
                    happens after it.
                  </p>
                </div>
                <div>
                  <Label htmlFor="setup-balance">Cash on hand</Label>
                  <Input
                    id="setup-balance"
                    type="number"
                    min="0"
                    step="0.01"
                    value={currentBalance || ''}
                    onChange={(e) => onCurrentBalanceChange(e.target.valueAsNumber || 0)}
                    placeholder="0.00"
                    className="mt-1 w-40"
                  />
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div>
                  <h2 className="text-base font-semibold">What goes out?</h2>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    Rent, power, loan repayments — anything that repeats. Due dates come later;
                    you can add them any time.
                  </p>
                </div>

                {expenses.length > 0 && (
                  <div className="divide-y divide-border">
                    {expenses.map((entry) => (
                      <div key={entry.id} className="flex items-center gap-2 py-1.5">
                        <span className="min-w-0 flex-1 truncate text-sm">{entry.name}</span>
                        <span className="text-sm tabular-nums text-muted-foreground">
                          {formatCurrency(toWeeklyAmount(entry.amount, entry.frequency))}/wk
                        </span>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Remove ${entry.name}`}
                          onClick={() => onRemoveExpense(entry.id)}
                        >
                          <X className="size-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <Separator />
                <div className="flex flex-wrap gap-2">
                  <CategoryCombobox
                    value={expenseName}
                    onValueChange={setExpenseName}
                    items={EXPENSE_CATEGORIES}
                    placeholder="Rent"
                    aria-label="Expense name"
                    className="min-w-28 flex-1"
                    onEnter={addExpense}
                  />
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addExpense()}
                    placeholder="Amount"
                    aria-label="Expense amount"
                    className="w-28"
                  />
                  <FrequencySelect
                    value={expenseFrequency}
                    onValueChange={setExpenseFrequency}
                    aria-label="How often it is due"
                    className="w-24"
                  />
                  <Button size="sm" onClick={addExpense}>
                    <Plus className="size-4" />
                    Add
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <div className="mt-4 flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStep((s) => Math.max(s - 1, 0))}
            disabled={step === 0}
          >
            Back
          </Button>
          <div className="flex items-center gap-2">
            {/* Every step is skippable: an empty calendar is a fine place to
                start, and a wizard that blocks is a wizard people abandon. */}
            <Button variant="ghost" size="sm" onClick={onDone}>
              Skip setup
            </Button>
            <Button size="sm" onClick={() => (isLast ? onDone() : setStep((s) => s + 1))}>
              {isLast ? 'See the calendar' : 'Next'}
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
