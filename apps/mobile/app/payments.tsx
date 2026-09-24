import { ScrollView, StyleSheet, View } from 'react-native';
import { formatCurrency } from '@money-ahead/core';
import { useBudgetContext } from '../src/budgetContext';
import { AddEntry, EntryRow } from '../src/components/EntryEditor';
import { OneOffSection } from '../src/components/OneOffSection';
import { Card, Empty, Figure, SectionTitle } from '../src/components/ui';
import { space, usePalette } from '../src/theme';

/**
 * Everything leaving: the commitments that repeat, and the purchases that
 * happen once.
 *
 * "Left each week" sits here rather than on the income page because it only
 * means anything once you have seen what goes out.
 */
export default function PaymentsScreen() {
  const b = useBudgetContext();
  const p = usePalette();

  return (
    <ScrollView
      style={{ backgroundColor: p.page }}
      contentContainerStyle={styles.screen}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.tiles}>
        <Figure
          label="Out each week"
          value={formatCurrency(b.weeklyExpenses)}
          hint="Everything that repeats"
        />
        <Figure
          label="Left each week"
          value={formatCurrency(b.weeklyLeftover)}
          hint="Income minus all of it"
          tone={b.weeklyLeftover < 0 ? 'bad' : b.weeklyLeftover > 0 ? 'good' : 'normal'}
        />
      </View>

      <View>
        <SectionTitle
          title="Recurring payments"
          hint="Rent, power, a subscription. A loan is just one of these with an end date."
        />
        <Card style={{ gap: 0 }}>
          {b.budget.expenses.length === 0 ? (
            <Empty>No recurring payments yet.</Empty>
          ) : (
            b.budget.expenses.map((entry) => (
              <EntryRow
                key={entry.id}
                entry={entry}
                tone="out"
                onUpdate={b.updateExpense}
                onRemove={b.removeExpense}
              />
            ))
          )}
        </Card>
        <View style={{ height: space.md }} />
        <AddEntry onAdd={b.addExpense} noun="payment" defaultFrequency="monthly" />
      </View>

      <OneOffSection
        direction="out"
        oneOffs={b.budget.oneOffs}
        today={b.today}
        onAdd={b.addOneOff}
        onRemove={b.removeOneOff}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { padding: space.lg, gap: space.xl, paddingBottom: space.xl * 2 },
  tiles: { flexDirection: 'row', gap: space.md },
});
