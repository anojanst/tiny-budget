import { useState } from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useBudgetContext } from '../src/budgetContext';
import { Button, Card, Field, SectionTitle } from '../src/components/ui';
import { space, usePalette } from '../src/theme';

/** Keeps a budget name usable as a filename without renaming it beyond recognition. */
function fileNameFor(name: string): string {
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `money-ahead-${slug || 'budget'}.json`;
}

export default function SettingsScreen() {
  const b = useBudgetContext();
  const p = usePalette();
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);

  /**
   * Writes a real `.json` file and shares that, rather than sharing the JSON
   * as a message. A message can only be pasted back; a file can be picked
   * back up by Import below, or opened by the web app — which is the whole
   * point of a backup. Falls back to sharing the text where no app on the
   * phone can receive a file.
   */
  const exportBudget = async () => {
    const json = b.exportJson();
    try {
      const file = new FileSystem.File(FileSystem.Paths.cache, fileNameFor(b.activeBudgetName));
      file.create({ overwrite: true });
      file.write(json);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'application/json',
          dialogTitle: 'Save your budget',
          UTI: 'public.json',
        });
        return;
      }
    } catch {
      // Fall through to the text share rather than leaving the button dead.
    }
    try {
      await Share.share({ message: json });
    } catch {
      // The user dismissing the sheet is not an error worth reporting.
    }
  };

  /**
   * Import asks before it acts, because the file was picked from a list of
   * downloads and the name on it may mean nothing. Nothing is replaced either
   * way — the file arrives as an additional budget.
   */
  const importBudget = async () => {
    setBusy(true);
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        // Some file providers hand JSON back as plain text or as a generic
        // stream, so anything is accepted here and parseImport does the
        // judging — a picker that refuses the user's actual backup is worse
        // than one that lets them choose the wrong file.
        type: '*/*',
        copyToCacheDirectory: true,
      });
      if (picked.canceled || !picked.assets?.[0]) return;
      const asset = picked.assets[0];
      const text = await new FileSystem.File(asset.uri).text();
      Alert.alert(
        'Import this backup?',
        `${asset.name ?? 'That file'} opens as an extra budget. Nothing you already have is touched.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Import it',
            onPress: () => {
              const error = b.importJson(text);
              if (error) {
                Alert.alert("That didn't import", error);
                return;
              }
              Alert.alert('Imported', 'It is open now. Your other budgets are unchanged.');
            },
          },
        ],
      );
    } catch {
      Alert.alert("That file couldn't be opened", 'Try exporting a fresh copy and picking that.');
    } finally {
      setBusy(false);
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
      style={{ backgroundColor: p.page }}
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
                  index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: p.line },
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
                      { borderColor: active ? p.brand : p.line },
                      active && { backgroundColor: p.brand },
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
          <Button label="Export this budget" variant="ghost" onPress={() => void exportBudget()} />
          <Button
            label="Import a backup"
            variant="ghost"
            disabled={busy}
            onPress={() => void importBudget()}
          />
          <Text style={[styles.body, { color: p.muted }]}>
            Exports open on the web app too, and web exports open here. An import arrives as an
            extra budget, so nothing on this phone is replaced.
          </Text>
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
