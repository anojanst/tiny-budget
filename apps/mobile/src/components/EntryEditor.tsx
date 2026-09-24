import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  formatCurrency,
  formatShortDate,
  parseLocalDate,
  toWeeklyAmount,
  type Frequency,
  type MoneyEntry,
} from '@money-ahead/core';
import { DateField } from './DateField';
import { Button, Card, Field } from './ui';
import { radius, space, usePalette } from '../theme';

const FREQUENCIES: { value: Frequency; short: string }[] = [
  { value: 'weekly', short: 'Wk' },
  { value: 'fortnightly', short: '2wk' },
  { value: 'monthly', short: 'Mo' },
  { value: 'quarterly', short: 'Qtr' },
  { value: 'biannual', short: '6mo' },
  { value: 'annual', short: 'Yr' },
];

/** A segmented row rather than a dropdown: six options fit, and seeing them
 *  all beats tapping to discover them. */
export function FrequencyPicker({
  value,
  onChange,
  label,
}: {
  value: Frequency;
  onChange: (next: Frequency) => void;
  label: string;
}) {
  const p = usePalette();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.freqRow}>
      {FREQUENCIES.map((f) => {
        const active = f.value === value;
        return (
          <Pressable
            key={f.value}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            accessibilityLabel={f.value}
            onPress={() => onChange(f.value)}
            style={[
              styles.freqChip,
              { borderColor: p.line },
              active && { backgroundColor: p.brand, borderColor: p.brand },
            ]}
          >
            <Text style={{ color: active ? p.onBrand : p.muted, fontSize: 12, fontWeight: '600' }}>
              {f.short}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * One recurring entry. Tapping the row opens its details rather than showing
 * every field for every row — twenty expenses with four fields each is a wall,
 * and the summary line is what people scan for.
 */
export function EntryRow({
  entry,
  onUpdate,
  onRemove,
  tone,
}: {
  entry: MoneyEntry;
  onUpdate: (id: string, patch: Partial<Omit<MoneyEntry, 'id'>>) => void;
  onRemove: (id: string) => void;
  tone: 'in' | 'out';
}) {
  const p = usePalette();
  const [open, setOpen] = useState(false);
  const weekly = toWeeklyAmount(entry.amount, entry.frequency);
  const due = entry.nextDue ? parseLocalDate(entry.nextDue) : null;

  return (
    <View style={{ borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: p.line }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${entry.name || 'Untitled'}, ${formatCurrency(weekly)} per week`}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((o) => !o)}
        style={styles.row}
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.rowName, { color: p.text }]} numberOfLines={1}>
            {entry.name || 'Untitled'}
          </Text>
          <Text style={[styles.rowMeta, { color: p.muted }]}>
            {due ? `Next ${formatShortDate(due)}` : 'No date — spread evenly'}
          </Text>
        </View>
        <Text
          style={[styles.rowAmount, { color: tone === 'in' ? p.mint : p.text }]}
        >
          {tone === 'in' ? '+' : '−'}
          {formatCurrency(weekly)}/wk
        </Text>
      </Pressable>

      {open && (
        <View style={styles.details}>
          <Field
            label="Name"
            value={entry.name}
            onChangeText={(name) => onUpdate(entry.id, { name })}
            placeholder="Name"
            accessibilityLabel="Entry name"
          />
          <Field
            label="Amount"
            value={String(entry.amount)}
            keyboardType="decimal-pad"
            onChangeText={(text) => onUpdate(entry.id, { amount: Number(text) || 0 })}
            accessibilityLabel="Entry amount"
          />
          <View>
            <Text style={[styles.detailLabel, { color: p.muted }]}>How often</Text>
            <FrequencyPicker
              value={entry.frequency}
              onChange={(frequency) => onUpdate(entry.id, { frequency })}
              label="How often"
            />
          </View>
          <DateField
            label="Next due"
            value={entry.nextDue ?? ''}
            optional
            placeholder="No date — spread evenly"
            onChange={(next) => onUpdate(entry.id, { nextDue: next || undefined })}
            accessibilityLabel="Next due date"
          />
          <DateField
            label="Ends"
            value={entry.endDate ?? ''}
            optional
            placeholder="Never"
            minimumDate={due ?? undefined}
            onChange={(next) => onUpdate(entry.id, { endDate: next || undefined })}
            accessibilityLabel="End date"
          />
          <Button label="Remove" variant="danger" onPress={() => onRemove(entry.id)} />
        </View>
      )}
    </View>
  );
}

/**
 * The add form, shared by income and expenses.
 *
 * The date is asked for here rather than only in the row that appears
 * afterwards, because the date is the thing that puts an entry on the
 * calendar — asking for it later meant most entries never got one and the
 * calendar stayed a drip. It stays optional: "I don't know when" is a real
 * answer, and an entry without a date is still worth having.
 */
export function AddEntry({
  onAdd,
  noun,
  defaultFrequency,
}: {
  onAdd: (name: string, amount: number, frequency: Frequency, nextDue?: string) => void;
  noun: string;
  defaultFrequency: Frequency;
}) {
  const p = usePalette();
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<Frequency>(defaultFrequency);
  const [nextDue, setNextDue] = useState('');

  const submit = () => {
    const parsed = Number(amount);
    if (!name.trim() || !Number.isFinite(parsed) || parsed <= 0) return;
    onAdd(name.trim(), parsed, frequency, nextDue || undefined);
    setName('');
    setAmount('');
    setNextDue('');
  };

  return (
    <Card style={{ gap: space.md }}>
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <Field
          style={{ flex: 1 }}
          placeholder={`New ${noun}`}
          value={name}
          onChangeText={setName}
          accessibilityLabel={`New ${noun} name`}
          returnKeyType="next"
        />
        <Field
          style={{ width: 110 }}
          placeholder="Amount"
          value={amount}
          keyboardType="decimal-pad"
          onChangeText={setAmount}
          accessibilityLabel={`New ${noun} amount`}
          onSubmitEditing={submit}
        />
      </View>
      <FrequencyPicker value={frequency} onChange={setFrequency} label={`How often the ${noun} repeats`} />
      <DateField
        label="Next due — optional"
        value={nextDue}
        optional
        placeholder="No date — spread evenly"
        onChange={setNextDue}
        accessibilityLabel={`Next ${noun} date`}
      />
      <Button label={`Add ${noun}`} onPress={submit} disabled={!name.trim() || !Number(amount)} />
      <Text style={{ color: p.muted, fontSize: 12 }}>
        {nextDue
          ? 'It lands on that day, then repeats on the cycle above.'
          : 'Without a date it is spread evenly instead of landing on a day. You can add one later.'}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 12 },
  rowName: { fontSize: 15, fontWeight: '600' },
  rowMeta: { fontSize: 12, marginTop: 1 },
  rowAmount: { fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },
  details: { gap: space.md, paddingBottom: space.lg },
  detailLabel: { fontSize: 12, marginBottom: 4 },
  freqRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  freqChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.chip,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
