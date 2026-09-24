import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { type Frequency } from '@money-ahead/core';
import { useBudgetContext } from '../budgetContext';
import { DateField } from './DateField';
import { FrequencyPicker } from './EntryEditor';
import { Button, Card, Field } from './ui';
import { radius, space, type as t, usePalette } from '../theme';

interface Draft {
  name: string;
  amount: string;
  freq: Frequency;
  due: string;
}

const blank = (freq: Frequency): Draft => ({ name: '', amount: '', freq, due: '' });
const filled = (d: Draft) => d.name.trim().length > 0 && Number(d.amount) > 0;

const COPY = [
  {
    title: 'Start with what you have',
    hint: 'Whatever is in your account right now. It is where the calendar starts counting from — a rough number is fine, and you can change it any time.',
  },
  {
    title: 'What comes in?',
    hint: 'Wages, a benefit, rent from a flatmate. Add one now and the rest later — the date is what puts it on the calendar.',
  },
  {
    title: 'What goes out?',
    hint: 'Rent, power, a subscription. One is enough to get started.',
  },
];

/**
 * The first three questions, asked one at a time.
 *
 * Shown whenever the active budget is empty, which is the same condition for
 * a fresh install, a budget just created and one just cleared — so there is
 * no "have they been onboarded" flag to store, migrate or get wrong.
 *
 * Nothing is written until the end. Saving each answer as it was given was
 * the obvious design and it was wrong: the first answer makes the budget
 * non-empty, which is the very condition this is shown for, so the flow
 * deleted itself out from under the person at step two. Holding the answers
 * here means "is this budget empty" stays true for the whole flow and can
 * simply be derived, with no flag latching it open.
 */
export function Onboarding({ onLeave }: { onLeave: () => void }) {
  const b = useBudgetContext();
  const p = usePalette();
  const [step, setStep] = useState(0);
  const [cash, setCash] = useState('');
  const [income, setIncome] = useState<Draft>(blank('fortnightly'));
  const [expense, setExpense] = useState<Draft>(blank('monthly'));

  const draft = step === 1 ? income : expense;
  const setDraft = step === 1 ? setIncome : setExpense;

  /** Writes whatever was actually entered, and leaves out whatever wasn't. */
  const commit = () => {
    b.setCurrentBalance(Number(cash) || 0);
    if (filled(income)) {
      b.addIncome(income.name.trim(), Number(income.amount), income.freq, income.due || undefined);
    }
    if (filled(expense)) {
      b.addExpense(
        expense.name.trim(),
        Number(expense.amount),
        expense.freq,
        expense.due || undefined,
      );
    }
    onLeave();
  };

  const advance = () => (step === 2 ? commit() : setStep(step + 1));

  return (
    <Card style={{ gap: space.md }}>
      <View style={styles.dots} accessibilityLabel={`Step ${step + 1} of ${COPY.length}`}>
        {COPY.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              { backgroundColor: i <= step ? p.brandInk : p.line, width: i === step ? 20 : 7 },
            ]}
          />
        ))}
      </View>

      <View style={{ gap: 4 }}>
        <Text style={[t.section, { color: p.text }]}>{COPY[step].title}</Text>
        <Text style={[t.small, { color: p.muted, lineHeight: 18 }]}>{COPY[step].hint}</Text>
      </View>

      {step === 0 ? (
        <Field
          label="Cash on hand"
          placeholder="0"
          value={cash}
          keyboardType="decimal-pad"
          onChangeText={setCash}
          accessibilityLabel="Cash on hand"
        />
      ) : (
        <>
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <Field
              style={{ flex: 1 }}
              placeholder={step === 1 ? 'Wages' : 'Rent'}
              value={draft.name}
              onChangeText={(name) => setDraft({ ...draft, name })}
              accessibilityLabel={step === 1 ? 'Income name' : 'Payment name'}
            />
            <Field
              style={{ width: 110 }}
              placeholder="Amount"
              value={draft.amount}
              keyboardType="decimal-pad"
              onChangeText={(amount) => setDraft({ ...draft, amount })}
              accessibilityLabel={step === 1 ? 'Income amount' : 'Payment amount'}
            />
          </View>
          <FrequencyPicker
            value={draft.freq}
            onChange={(freq) => setDraft({ ...draft, freq })}
            label="How often"
          />
          <DateField
            label="Next one — optional"
            value={draft.due}
            optional
            placeholder="No date — spread evenly"
            onChange={(due) => setDraft({ ...draft, due })}
            accessibilityLabel={step === 1 ? 'Next income date' : 'Next payment date'}
          />
        </>
      )}

      <Button
        label={step === 2 ? 'Finish' : 'Next'}
        onPress={advance}
        disabled={step > 0 && !filled(draft)}
      />
      <Button
        label={step === 0 ? "I'll add the details myself" : 'Skip this one'}
        variant="ghost"
        onPress={step === 2 ? commit : step === 0 ? onLeave : () => setStep(step + 1)}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  dots: { flexDirection: 'row', gap: 5, alignItems: 'center' },
  dot: { height: 7, borderRadius: radius.chip },
});
