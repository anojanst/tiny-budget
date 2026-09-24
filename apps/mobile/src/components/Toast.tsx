import { useEffect, useMemo } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { radius, shadow, space, type as t, usePalette } from '../theme';

/**
 * A brief message that explains something the app just declined to do.
 *
 * Deliberately not an Alert: an alert stops everything and demands a tap,
 * which is a lot of ceremony for "that button doesn't apply here". A toast
 * says it and gets out of the way. `ToastAndroid` would have been less code
 * but exists only on Android, and a rule the app enforces should be explained
 * the same way everywhere.
 */
export function Toast({ message }: { message: string | null }) {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  // useMemo rather than a ref: a ref's `.current` read during render is
  // exactly what it is not for, and this value never needs to survive a
  // change it does not cause.
  const fade = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    Animated.timing(fade, {
      toValue: message ? 1 : 0,
      duration: 160,
      useNativeDriver: true,
    }).start();
  }, [message, fade]);

  // Kept mounted while fading out, but never in the way of a tap.
  if (!message) return null;
  return (
    <Animated.View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={[
        styles.wrap,
        shadow.hero,
        { bottom: insets.bottom + space.xl, backgroundColor: p.text, opacity: fade },
      ]}
    >
      <Text style={[t.label, { color: p.surface, textAlign: 'center' }]}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: space.lg,
    right: space.lg,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    borderRadius: radius.control,
  },
});
