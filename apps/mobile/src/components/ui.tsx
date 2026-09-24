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
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { radius, shadow, space, type as t, usePalette } from '../theme';

export type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const p = usePalette();
  return (
    <View
      style={[styles.card, shadow.card, { backgroundColor: p.surface }, style]}
    >
      {children}
    </View>
  );
}

export function SectionTitle({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  /** A trailing link, the way a list header carries "See all". */
  action?: { label: string; onPress: () => void };
}) {
  const p = usePalette();
  return (
    <View style={styles.sectionHead}>
      <View style={{ flex: 1, gap: 1 }}>
        <Text style={[t.section, { color: p.text }]}>{title}</Text>
        {hint ? <Text style={[t.small, { color: p.muted, lineHeight: 17 }]}>{hint}</Text> : null}
      </View>
      {action ? (
        <Pressable accessibilityRole="button" onPress={action.onPress} hitSlop={8}>
          <Text style={[t.label, { color: p.brandInk, fontWeight: '600' }]}>{action.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/**
 * A single movement of money: an icon disc that says what kind of thing it is,
 * the name and its date stacked, and the amount held right. Reading a list of
 * these is scanning one column of names and one column of figures, rather than
 * parsing a line of prose per row.
 */
export function MovementRow({
  icon,
  tint,
  title,
  subtitle,
  amount,
  amountTone = 'normal',
  first,
}: {
  icon: IconName;
  tint: 'brand' | 'mint' | 'peach' | 'slate' | 'rose';
  title: string;
  subtitle: string;
  amount: string;
  amountTone?: 'normal' | 'in' | 'bad';
  first?: boolean;
}) {
  const p = usePalette();
  const wash =
    tint === 'mint' ? p.mintWash
    : tint === 'peach' ? p.peachWash
    : tint === 'rose' ? p.roseWash
    : tint === 'brand' ? p.brandWash
    : p.slateWash;
  const ink =
    tint === 'mint' ? p.mint
    : tint === 'peach' ? p.peach
    : tint === 'rose' ? p.rose
    : tint === 'brand' ? p.brandInk
    : p.muted;
  const amountColor = amountTone === 'in' ? p.mint : amountTone === 'bad' ? p.rose : p.text;
  return (
    <View
      style={[
        styles.movement,
        !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: p.line },
      ]}
    >
      <View style={[styles.movementDisc, { backgroundColor: wash }]}>
        <MaterialCommunityIcons name={icon} size={21} color={ink} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[t.body, { color: p.text, fontWeight: '600' }]} numberOfLines={1}>
          {title}
        </Text>
        <Text style={[t.small, { color: p.muted }]} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      <Text style={[t.label, { color: amountColor, fontWeight: '700', fontVariant: ['tabular-nums'] }]}>
        {amount}
      </Text>
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
    tone === 'bad' ? p.rose : tone === 'warn' ? p.peach : tone === 'good' ? p.mint : p.text;
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
      {label ? <Text style={[t.small, { color: p.muted, marginBottom: 5 }]}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={p.muted}
        {...props}
        style={[styles.input, { color: p.text, backgroundColor: p.page, borderColor: p.line }]}
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
  const bg = variant === 'primary' ? p.brand : variant === 'danger' ? p.roseWash : 'transparent';
  const fg = variant === 'primary' ? p.onBrand : variant === 'danger' ? p.rose : p.text;
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
 * The quick-action row. Each disc gets its own pastel wash so the three are
 * told apart by colour as well as glyph, which is how the row stays scannable
 * at a glance rather than becoming three identical grey circles.
 */
export function QuickAction({
  icon,
  label,
  tint,
  onPress,
}: {
  icon: IconName;
  label: string;
  tint: 'brand' | 'mint' | 'peach' | 'slate';
  onPress: () => void;
}) {
  const p = usePalette();
  const wash =
    tint === 'mint' ? p.mintWash : tint === 'peach' ? p.peachWash : tint === 'brand' ? p.brandWash : p.slateWash;
  const ink =
    tint === 'mint' ? p.mint : tint === 'peach' ? p.peach : tint === 'brand' ? p.brandInk : p.muted;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.quick, { opacity: pressed ? 0.6 : 1 }]}
    >
      <View style={[styles.quickDisc, { backgroundColor: wash }]}>
        <MaterialCommunityIcons name={icon} size={26} color={ink} />
      </View>
      <Text style={[t.small, { color: p.text, fontWeight: '500' }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  const p = usePalette();
  return <Text style={[t.body, styles.empty, { color: p.muted }]}>{children}</Text>;
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.card, padding: space.lg, gap: space.xs },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space.md,
    marginBottom: space.md,
  },
  movement: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 13 },
  movementDisc: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  quick: { alignItems: 'center', gap: 7, flex: 1 },
  quickDisc: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center' },
  empty: { paddingVertical: space.md, textAlign: 'center' },
});
