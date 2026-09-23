import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { formatCurrency, type OneOffDirection } from '@tiny-budget/core';
import { useBudgetContext } from '../src/budgetContext';
import { AddEntry, EntryRow } from '../src/components/EntryEditor';
import { Button, Card, Empty, Field, Figure, SectionTitle } from '../src/components/ui';
import { radius, space, usePalette } from '../src/theme';

export default function MoneyScreen() {
  const b = useBudgetContext();
  const p = usePalette();

  const [oneOffName, setOneOffName] = useState('');
  const [oneOffAmount, setOneOffAmount] = useState('');
  const [oneOffDate, setOneOffDate] = useState('');
  const [direction, setDirection] = useState<OneOffDirection>('out');

  const addOneOff = () => {
    const parsed = Number(oneOffAmount);
    if (!oneOffName.trim() || !Number.isFinite(parsed) || parsed <= 0 || !oneOffDate.trim()) return;
    b.addOneOff(oneOffName.trim(), parsed, oneOffDate.trim(), direction);
    setOneOffName('');
    setOneOffAmount('');
    setOneOffDate('');
  };

  const upcoming = b.budget.oneOffs.filter((o) => o.date >= toKey(b.today));
  const totalOut = upcoming.filter((o) => o.direction !== 'in').reduce((s, o) => s + o.amount, 0);
  const totalIn = upcoming.filter((o) => o.direction === 'in').reduce((s, o) => s + o.amount, 0);

  return (
    <ScrollView
      style={{ backgroundColor: p.paper }}
      contentContainerStyle={styles.screen}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.tiles}>
        <Figure
          label="Left each week"
          value={formatCurrency(b.weeklyLeftover)}
          hint="Income minus everything that repeats"
          tone={b.weeklyLeftover < 0 ? 'bad' : b.weeklyLeftover > 0 ? 'good' : 'normal'}
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
          hint={`${formatCurrency(b.weeklyIncome)}/wk across every stream.`}
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

      <View>
        <SectionTitle
          title="Recurring payments"
          hint={`${formatCurrency(b.weeklyExpenses)}/wk. A loan is just one of these with an end date.`}
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

      <View>
        <SectionTitle
          title="One-offs"
          hint="Single dated payments and windfalls. They never touch the weekly figures."
        />
        <Card style={{ gap: 0 }}>
          {b.budget.oneOffs.length === 0 ? (
            <Empty>Nothing planned.</Empty>
          ) : (
            [...b.budget.oneOffs]
              .sort((x, y) => x.date.localeCompare(y.date))
              .map((item, index) => (
                <View
                  key={item.id}
                  style={[
                    styles.oneOff,
                    index > 0 && {
                      borderTopWidth: StyleSheet.hairlineWidth,
                      borderTopColor: p.line,
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: p.text, fontWeight: '600' }}>{item.name}</Text>
                    <Text style={{ color: p.muted, fontSize: 12 }}>{item.date}</Text>
                  </View>
                  <Text
                    style={{
                      color: item.direction === 'in' ? p.tide : p.text,
                      fontWeight: '700',
                      fontVariant: ['tabular-nums'],
                    }}
                  >
                    {item.direction === 'in' ? '+' : '−'}
                    {formatCurrency(item.amount)}
                  </Text>
                  <Button label="✕" variant="ghost" onPress={() => b.removeOneOff(item.id)} />
                </View>
              ))
          )}
        </Card>

        <View style={{ height: space.md }} />
        <Card style={{ gap: space.md }}>
          <Text style={{ color: p.muted, fontSize: 12 }}>
            {formatCurrency(totalOut)} out · {formatCurrency(totalIn)} in, still to come
          </Text>
          <View style={styles.dirRow}>
            {(['out', 'in'] as OneOffDirection[]).map((d) => {
              const active = direction === d;
              return (
                <Pressable
                  key={d}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={d === 'out' ? 'Money out' : 'Money in'}
                  onPress={() => setDirection(d)}
                  style={[
                    styles.dirChip,
                    { borderColor: p.line },
                    active && { backgroundColor: p.tide, borderColor: p.tide },
                  ]}
                >
                  <Text style={{ color: active ? '#FFFFFF' : p.muted, fontWeight: '600' }}>
                    {d === 'out' ? 'Out' : 'In'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Field
            placeholder={direction === 'in' ? 'Tax refund' : 'Headphones'}
            value={oneOffName}
            onChangeText={setOneOffName}
            accessibilityLabel="New one-off name"
          />
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <Field
              style={{ flex: 1 }}
              placeholder="Amount"
              value={oneOffAmount}
              keyboardType="decimal-pad"
              onChangeText={setOneOffAmount}
              accessibilityLabel="New one-off amount"
            />
            <Field
              style={{ flex: 1 }}
              placeholder="2026-10-31"
              value={oneOffDate}
              autoCapitalize="none"
              onChangeText={setOneOffDate}
              accessibilityLabel="New one-off date"
            />
          </View>
          <Button
            label="Add one-off"
            onPress={addOneOff}
            disabled={!oneOffName.trim() || !Number(oneOffAmount) || !oneOffDate.trim()}
          />
        </Card>
      </View>
    </ScrollView>
  );
}

function toKey(date: Date): string {
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

const styles = StyleSheet.create({
  screen: { padding: space.lg, gap: space.xl, paddingBottom: space.xl * 2 },
  tiles: { flexDirection: 'row', gap: space.md },
  oneOff: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: 10 },
  dirRow: { flexDirection: 'row', gap: space.sm },
  dirChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: radius.chip,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
