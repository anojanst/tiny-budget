import { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { formatShortDate, parseLocalDate } from '@tiny-budget/core';
import { radius, space, type as t, usePalette } from '../theme';

export interface DateFieldProps {
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
}

/**
 * The look of a date field, with no opinion about how a date gets picked.
 *
 * Android and iOS open a native dialog; the web has its own picker and no
 * dialog to open. Keeping the chrome here means the two implementations
 * differ only in the mechanism, so the control cannot drift into looking like
 * two different things on two platforms.
 */
export function DateFieldShell({
  label,
  value,
  onChange,
  placeholder = 'Pick a date',
  optional,
  style,
  accessibilityLabel,
  onPress,
  overlay,
  children,
}: DateFieldProps & {
  onPress?: () => void;
  /** Sits inside the control, for a picker the platform opens itself. */
  overlay?: ReactNode;
  /** Sits after the control, where a native dialog mounts. */
  children?: ReactNode;
}) {
  const p = usePalette();
  const parsed = value ? parseLocalDate(value) : null;

  return (
    <View style={style}>
      {label ? <Text style={[t.small, { color: p.muted, marginBottom: 5 }]}>{label}</Text> : null}
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel ?? label ?? 'Pick a date'}
            accessibilityValue={{ text: parsed ? formatShortDate(parsed) : 'No date set' }}
            onPress={onPress}
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
          {overlay}
        </View>
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
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  control: {
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
