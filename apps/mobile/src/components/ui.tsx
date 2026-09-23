import { type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { radius, space, usePalette } from '../theme';

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const p = usePalette();
  return (
    <View
      style={[
        { backgroundColor: p.card, borderColor: p.border, borderWidth: StyleSheet.hairlineWidth },
        styles.card,
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function SectionTitle({ title, hint }: { title: string; hint?: string }) {
  const p = usePalette();
  return (
    <View style={{ marginBottom: space.sm }}>
      <Text style={[styles.sectionTitle, { color: p.text }]}>{title}</Text>
      {hint ? <Text style={[styles.hint, { color: p.muted }]}>{hint}</Text> : null}
    </View>
  );
}

/**
 * The one figure a screen is about, with its own explanation underneath.
 * `tone` carries meaning that colour alone would not: a shortfall reads as a
 * shortfall in greyscale too, because the hint says so.
 */
export function StatTile({
  label,
  value,
  hint,
  tone = 'normal',
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'normal' | 'good' | 'bad';
}) {
  const p = usePalette();
  const color = tone === 'bad' ? p.danger : tone === 'good' ? p.primary : p.text;
  return (
    <Card style={{ flex: 1, minWidth: 140 }}>
      <Text style={[styles.tileLabel, { color: p.muted }]}>{label}</Text>
      <Text style={[styles.tileValue, { color }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {hint ? (
        <Text style={[styles.hint, { color: p.muted }]} numberOfLines={2}>
          {hint}
        </Text>
      ) : null}
    </Card>
  );
}

export function Field({
  label,
  style,
  ...props
}: TextInputProps & { label?: string; style?: ViewStyle }) {
  const p = usePalette();
  return (
    <View style={style}>
      {label ? <Text style={[styles.fieldLabel, { color: p.muted }]}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={p.muted}
        {...props}
        style={[
          styles.input,
          { color: p.text, backgroundColor: p.bg, borderColor: p.border },
          props.multiline ? { height: 96, textAlignVertical: 'top' } : null,
        ]}
      />
    </View>
  );
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost' | 'danger';
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const p = usePalette();
  const bg =
    variant === 'primary' ? p.primary : variant === 'danger' ? p.dangerBg : 'transparent';
  const fg =
    variant === 'primary' ? p.primaryText : variant === 'danger' ? p.danger : p.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: bg,
          borderColor: variant === 'ghost' ? p.border : 'transparent',
          borderWidth: variant === 'ghost' ? StyleSheet.hairlineWidth : 0,
          opacity: disabled ? 0.45 : pressed ? 0.75 : 1,
        },
        style,
      ]}
    >
      <Text style={[styles.buttonLabel, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  const p = usePalette();
  return <Text style={[styles.empty, { color: p.muted }]}>{children}</Text>;
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, padding: space.lg, gap: space.xs },
  sectionTitle: { fontSize: 17, fontWeight: '600', letterSpacing: -0.2 },
  hint: { fontSize: 12, lineHeight: 16 },
  tileLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6 },
  tileValue: { fontSize: 22, fontWeight: '700', marginTop: 2, fontVariant: ['tabular-nums'] },
  fieldLabel: { fontSize: 12, marginBottom: 4 },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: 10,
    fontSize: 16,
  },
  button: {
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLabel: { fontSize: 15, fontWeight: '600' },
  empty: { fontSize: 14, paddingVertical: space.md, textAlign: 'center' },
});
