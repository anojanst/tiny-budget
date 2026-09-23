import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  formatCurrency,
  formatShortDate,
  parseLocalDate,
  toDateInputValue,
  type OneOff,
  type OneOffDirection,
} from '@tiny-budget/core';
import { DateField } from './DateField';
import { Button, Card, Empty, Field, SectionTitle } from './ui';
import { space, usePalette } from '../theme';

/** Falls back to the raw string rather than hiding a date it can't parse. */
function readableDate(value: string): string {
  const parsed = parseLocalDate(value);
  return parsed ? formatShortDate(parsed) : value;
}

const COPY = {
  out: {
    title: 'One-off payments',
    hint: 'A purchase that happens once. It never touches the weekly figures.',
    empty: 'Nothing planned.',
    example: 'Headphones',
    add: 'Add payment',
    total: (amount: string) => `${amount} still to come`,
  },
  in: {
    title: 'One-off money in',
    hint: 'A refund, a bonus, something sold. It never touches the weekly figures.',
    empty: 'Nothing expected.',
    example: 'Tax refund',
    add: 'Add one-off',
    total: (amount: string) => `${amount} still to come`,
  },
} as const;

/**
 * The one-offs going one way.
 *
 * Direction used to be a toggle in the form, because both kinds shared a
 * page. Now that money in and money out have a page each, the page already
 * says which way it goes — so the control disappears, and with it the chance
 * of filing a purchase as a windfall by leaving a chip unpressed.
 */
export function OneOffSection({
  direction,
  oneOffs,
  today,
  onAdd,
  onRemove,
}: {
  direction: OneOffDirection;
  oneOffs: OneOff[];
  today: Date;
  onAdd: (name: string, amount: number, date: string, direction: OneOffDirection) => void;
  onRemove: (id: string) => void;
}) {
  const p = usePalette();
  const copy = COPY[direction];
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');

  const mine = oneOffs
    .filter((item) => item.direction === direction)
    .sort((a, b) => a.date.localeCompare(b.date));
  const stillToCome = mine
    .filter((item) => item.date >= toDateInputValue(today))
    .reduce((total, item) => total + item.amount, 0);

  const submit = () => {
    const parsed = Number(amount);
    if (!name.trim() || !Number.isFinite(parsed) || parsed <= 0 || !date) return;
    onAdd(name.trim(), parsed, date, direction);
    setName('');
    setAmount('');
    setDate('');
  };

  return (
    <View>
      <SectionTitle title={copy.title} hint={copy.hint} />
      <Card style={{ gap: 0 }}>
        {mine.length === 0 ? (
          <Empty>{copy.empty}</Empty>
        ) : (
          mine.map((item, index) => (
            <View
              key={item.id}
              style={[
                styles.row,
                index > 0 && {
                  borderTopWidth: StyleSheet.hairlineWidth,
                  borderTopColor: p.line,
                },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ color: p.text, fontWeight: '600' }}>{item.name}</Text>
                <Text style={{ color: p.muted, fontSize: 12 }}>{readableDate(item.date)}</Text>
              </View>
              <Text
                style={{
                  color: direction === 'in' ? p.mint : p.text,
                  fontWeight: '700',
                  fontVariant: ['tabular-nums'],
                }}
              >
                {direction === 'in' ? '+' : '−'}
                {formatCurrency(item.amount)}
              </Text>
              <Button label="✕" variant="ghost" onPress={() => onRemove(item.id)} />
            </View>
          ))
        )}
      </Card>

      <View style={{ height: space.md }} />
      <Card style={{ gap: space.md }}>
        <Text style={{ color: p.muted, fontSize: 12 }}>
          {copy.total(formatCurrency(stillToCome))}
        </Text>
        <Field
          placeholder={copy.example}
          value={name}
          onChangeText={setName}
          accessibilityLabel={`New ${copy.title} name`}
        />
        <Field
          placeholder="Amount"
          value={amount}
          keyboardType="decimal-pad"
          onChangeText={setAmount}
          accessibilityLabel={`New ${copy.title} amount`}
        />
        {/* Required, unlike a recurring entry's date: a one-off *is* its date.
            Without one there is nothing to spread and nothing to land, so
            there would be no way to show it at all. */}
        <DateField
          value={date}
          onChange={setDate}
          placeholder="When does it happen?"
          minimumDate={today}
          accessibilityLabel={`New ${copy.title} date`}
        />
        <Button
          label={copy.add}
          onPress={submit}
          disabled={!name.trim() || !Number(amount) || !date}
        />
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: 10 },
});
