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
import { radius, space, type as t, usePalette } from '../theme';

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const p = usePalette();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: p.surface, borderColor: p.line, borderWidth: StyleSheet.hairlineWidth },
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
    <View style={{ marginBottom: space.md, gap: 2 }}>
      <Text style={[t.title, { color: p.text }]}>{title}</Text>
      {hint ? <Text style={[t.small, { color: p.muted, lineHeight: 17 }]}>{hint}</Text> : null}
    </View>
  );
}

/**
 * A quiet figure. The label sits in sentence case rather than tracked-out
 * capitals — capitals are the default dressing for a stat and add nothing the
 * size difference isn't already saying.
 */
export function Figure({
  label,
  value,
  hint,
  tone = 'normal',
  style,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'normal' | 'good' | 'warn' | 'bad';
  style?: ViewStyle;
}) {
  const p = usePalette();
  const color =
    tone === 'bad' ? p.aground : tone === 'warn' ? p.shoal : tone === 'good' ? p.tide : p.text;
  return (
    <Card style={StyleSheet.flatten([{ flex: 1, minWidth: 140, gap: 2 }, style])}>
      <Text style={[t.small, { color: p.muted }]}>{label}</Text>
      <Text style={[t.figure, { color, fontVariant: ['tabular-nums'] }]} numberOfLines={1}>
        {value}
      </Text>
      {hint ? (
        <Text style={[t.small, { color: p.muted, lineHeight: 16 }]} numberOfLines={2}>
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
      {label ? (
        <Text style={[t.small, { color: p.muted, marginBottom: 5 }]}>{label}</Text>
      ) : null}
      <TextInput
        placeholderTextColor={p.muted}
        {...props}
        style={[
          styles.input,
          { color: p.text, backgroundColor: p.paper, borderColor: p.line },
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
  const bg = variant === 'primary' ? p.tide : variant === 'danger' ? p.agroundWash : 'transparent';
  const fg = variant === 'primary' ? '#FFFFFF' : variant === 'danger' ? p.aground : p.text;
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
          borderColor: variant === 'ghost' ? p.line : 'transparent',
          borderWidth: variant === 'ghost' ? StyleSheet.hairlineWidth : 0,
          opacity: disabled ? 0.4 : pressed ? 0.75 : 1,
        },
        style,
      ]}
    >
      <Text style={[t.label, { color: fg, fontWeight: '600' }]}>{label}</Text>
    </Pressable>
  );
}

/**
 * The row of things you can add, carried over from the reference kit's
 * quick-action row — the one pattern in it that genuinely saves a tab switch.
 */
export function QuickAction({
  glyph,
  label,
  onPress,
}: {
  glyph: string;
  label: string;
  onPress: () => void;
}) {
  const p = usePalette();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.quick, { opacity: pressed ? 0.6 : 1 }]}
    >
      <View style={[styles.quickDisc, { backgroundColor: p.tideWash, borderColor: p.line }]}>
        <Text style={{ color: p.tide, fontSize: 18, fontWeight: '600' }}>{glyph}</Text>
      </View>
      <Text style={[t.small, { color: p.muted }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  const p = usePalette();
  return (
    <Text style={[t.body, styles.empty, { color: p.muted }]}>{children}</Text>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.card, padding: space.lg, gap: space.xs },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.control,
    paddingHorizontal: space.md,
    paddingVertical: 11,
    fontSize: 16,
  },
  button: {
    borderRadius: radius.control,
    paddingHorizontal: space.lg,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quick: { alignItems: 'center', gap: 6, flex: 1 },
  quickDisc: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  empty: { paddingVertical: space.md, textAlign: 'center' },
});
