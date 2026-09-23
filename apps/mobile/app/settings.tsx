import { useState } from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useBudgetContext } from '../src/budgetContext';
import { Button, Card, Field, SectionTitle } from '../src/components/ui';
import { space, usePalette } from '../src/theme';

export default function SettingsScreen() {
  const b = useBudgetContext();
  const p = usePalette();
  const [newName, setNewName] = useState('');

  const share = async () => {
    try {
      await Share.share({ message: b.exportJson() });
    } catch {
      // The user dismissing the sheet is not an error worth reporting.
    }
  };

  const confirmDelete = (id: string, name: string) => {
    Alert.alert(
      `Delete "${name}"?`,
      "Its income, payments and one-offs go for good. This can't be undone — export it first if you might want it back.",
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => b.deleteBudget(id) },
      ],
    );
  };

  return (
    <ScrollView
      style={{ backgroundColor: p.bg }}
      contentContainerStyle={styles.screen}
      keyboardShouldPersistTaps="handled"
    >
      <View>
        <SectionTitle
          title="Budgets"
          hint="A household, a flat, a what-if. Each keeps its own income, payments and one-offs."
        />
        <Card style={{ gap: 0 }}>
          {b.budgets.map((entry, index) => {
            const active = entry.id === b.activeBudgetId;
            return (
              <View
                key={entry.id}
                style={[
                  styles.row,
                  index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: p.border },
                ]}
              >
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`Switch to ${entry.name}`}
                  onPress={() => b.switchBudget(entry.id)}
                  style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.sm }}
                >
                  <View
                    style={[
                      styles.radio,
                      { borderColor: active ? p.primary : p.border },
                      active && { backgroundColor: p.primary },
                    ]}
                  />
                  <Text style={{ color: p.text, fontWeight: active ? '700' : '500' }}>
                    {entry.name}
                  </Text>
                </Pressable>
                <Button
                  label="Delete"
                  variant="danger"
                  onPress={() => confirmDelete(entry.id, entry.name)}
                />
              </View>
            );
          })}
        </Card>

        <View style={{ height: space.md }} />
        <Card style={{ gap: space.md }}>
          <Field
            placeholder="New budget name"
            value={newName}
            onChangeText={setNewName}
            accessibilityLabel="New budget name"
          />
          <Button
            label="Create budget"
            disabled={!newName.trim()}
            onPress={() => {
              b.createBudget(newName.trim());
              setNewName('');
            }}
          />
        </Card>
      </View>

      <View>
        <SectionTitle
          title="Backup"
          hint="Everything lives on this phone only. An export is the only copy that survives losing it."
        />
        <Card style={{ gap: space.md }}>
          <Button label="Export this budget" variant="ghost" onPress={share} />
        </Card>
      </View>

      <View>
        <SectionTitle title="How this works" />
        <Card style={{ gap: space.md }}>
          <Text style={[styles.body, { color: p.muted }]}>
            <Text style={{ color: p.text, fontWeight: '600' }}>Dates are what matter. </Text>
            An entry with a date lands on that day. One without is spread evenly instead, because
            nothing knows when it leaves.
          </Text>
          <Text style={[styles.body, { color: p.muted }]}>
            <Text style={{ color: p.text, fontWeight: '600' }}>A loan is just a payment. </Text>
            Give it an amount, a cycle and an end date, and the calendar stops charging it the week
            it is paid off.
          </Text>
          <Text style={[styles.body, { color: p.muted }]}>
            <Text style={{ color: p.text, fontWeight: '600' }}>One-offs happen once. </Text>
            A purchase or a windfall moves cash on its date and never comes back around.
          </Text>
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { padding: space.lg, gap: space.xl, paddingBottom: space.xl * 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: 10 },
  radio: { width: 16, height: 16, borderRadius: 8, borderWidth: 2 },
  body: { fontSize: 13, lineHeight: 19 },
});
