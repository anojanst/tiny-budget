import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { formatShortDate, parseLocalDate, startOfToday, toDateInputValue } from '@tiny-budget/core';
import { radius, space, type as t, usePalette } from '../theme';

/**
 * A date, picked rather than typed.
 *
 * Every date in this app is a `yyyy-mm-dd` string, which is the right thing to
 * store and the wrong thing to ask a person to type on a phone keyboard — a
 * slip produces a silently wrong projection rather than an error. The control
 * shows the date the way people read one and hands back the format the store
 * wants, so the two never have to agree in a user's head.
 *
 * Optional dates keep a clear button: undated is a real, meaningful state
 * here, not an empty field waiting to be filled.
 */
export function DateField({
  label,
  value,
  onChange,
  placeholder = 'Pick a date',
  optional,
  minimumDate,
  style,
  accessibilityLabel,
}: {
  label?: string;
  /** `yyyy-mm-dd`, or empty for no date. */
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  /** Shows a clear button, and says "no date" is allowed. */
  optional?: boolean;
  minimumDate?: Date;
  style?: ViewStyle;
  accessibilityLabel?: string;
}) {
  const p = usePalette();
  const [open, setOpen] = useState(false);
  const parsed = value ? parseLocalDate(value) : null;

  // Opening on today is a better guess than opening on the epoch when the
  // field is empty, and than opening on an unparseable string when it isn't.
  const initial = parsed ?? startOfToday();

  const handle = (event: DateTimePickerEvent, next?: Date) => {
    // Android fires once and dismisses itself; iOS keeps the spinner up.
    if (Platform.OS === 'android') setOpen(false);
    if (event.type === 'dismissed' || !next) return;
    onChange(toDateInputValue(next));
    if (Platform.OS === 'ios') setOpen(false);
  };

  return (
    <View style={style}>
      {label ? <Text style={[t.small, { color: p.muted, marginBottom: 5 }]}>{label}</Text> : null}
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel ?? label ?? 'Pick a date'}
          accessibilityValue={{ text: parsed ? formatShortDate(parsed) : 'No date set' }}
          onPress={() => setOpen(true)}
          style={({ pressed }) => [
            styles.control,
            { backgroundColor: p.page, borderColor: p.line, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <MaterialCommunityIcons name="calendar-blank" size={18} color={p.muted} />
          <Text style={[t.body, { color: parsed ? p.text : p.muted, flex: 1 }]} numberOfLines={1}>
            {parsed ? formatShortDate(parsed) : placeholder}
          </Text>
        </Pressable>
        {optional && parsed ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Clear ${label ?? 'date'}`}
            onPress={() => onChange('')}
            hitSlop={8}
            style={({ pressed }) => [
              styles.clear,
              { borderColor: p.line, opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <MaterialCommunityIcons name="close" size={16} color={p.muted} />
          </Pressable>
        ) : null}
      </View>
      {open ? (
        <DateTimePicker
          value={initial}
          mode="date"
          minimumDate={minimumDate}
          onChange={handle}
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  control: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.control,
    paddingHorizontal: space.md,
    // Matches Field's input box exactly — 16pt text with 11pt padding — so a
    // date sitting beside an amount doesn't read as a different kind of thing.
    paddingVertical: 13,
  },
  clear: {
    width: 38,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.control,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
