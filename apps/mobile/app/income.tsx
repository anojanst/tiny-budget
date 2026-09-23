import { ScrollView, StyleSheet, View } from 'react-native';
import { formatCurrency } from '@tiny-budget/core';
import { useBudgetContext } from '../src/budgetContext';
import { AddEntry, EntryRow } from '../src/components/EntryEditor';
import { OneOffSection } from '../src/components/OneOffSection';
import { Card, Empty, Field, Figure, SectionTitle } from '../src/components/ui';
import { space, usePalette } from '../src/theme';

/**
 * Everything arriving: the streams that repeat, the money already in the
 * account, and the windfalls that land once.
 *
 * In and out used to share a page, which meant scrolling past your wages to
 * reach your rent and reading two opposite kinds of figure in one column.
 * Splitting them gives each side its own totals at the top, and lets the
 * one-off form drop its direction toggle — the page already says which way
 * the money goes.
 */
export default function IncomeScreen() {
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
          label="In each week"
          value={formatCurrency(b.weeklyIncome)}
          hint="Across every stream"
          tone={b.weeklyIncome > 0 ? 'good' : 'normal'}
        />
        <Figure
          label="Cash on hand"
          value={formatCurrency(b.budget.currentBalance)}
          hint="Where the calendar starts"
        />
      </View>

      <Card>
        <Field
          label="Cash on hand — what's in the account right now"
          value={String(b.budget.currentBalance)}
          keyboardType="decimal-pad"
          onChangeText={(text) => b.setCurrentBalance(Number(text) || 0)}
          accessibilityLabel="Cash on hand"
        />
      </Card>

      <View>
        <SectionTitle
          title="Income"
          hint="Wages, a benefit, rent from a flatmate. Several streams can land on the same day or different ones."
        />
        <Card style={{ gap: 0 }}>
          {b.budget.incomes.length === 0 ? (
            <Empty>No income yet.</Empty>
          ) : (
            b.budget.incomes.map((entry) => (
              <EntryRow
                key={entry.id}
                entry={entry}
                tone="in"
                onUpdate={b.updateIncome}
                onRemove={b.removeIncome}
              />
            ))
          )}
        </Card>
        <View style={{ height: space.md }} />
        <AddEntry onAdd={b.addIncome} noun="income stream" defaultFrequency="fortnightly" />
      </View>

      <OneOffSection
        direction="in"
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
