import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { ColorValue } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BudgetProvider } from '../src/BudgetProvider';
import type { IconName } from '../src/components/ui';
import { space, usePalette } from '../src/theme';

/**
 * The selected tab fills in rather than only changing colour, so the current
 * place is legible without relying on hue.
 *
 * Not every glyph has an outline twin — `cash-plus` has none, and asking for
 * `cash-plus-outline` rendered a literal "?" in the bar. The set is checked
 * rather than assumed, so a missing pair costs the fill affordance (colour
 * still marks the tab) instead of shipping a broken glyph.
 */
function TabIcon({
  name,
  color,
  focused,
  size = 25,
}: {
  name: IconName;
  color: ColorValue;
  focused: boolean;
  size?: number;
}) {
  const outline = `${name}-outline` as IconName;
  const resolved = focused || !(outline in MaterialCommunityIcons.glyphMap) ? name : outline;
  return <MaterialCommunityIcons name={resolved} size={size} color={color as string} />;
}

/**
 * Split out so it can read the safe-area insets, which only exist inside the
 * provider.
 *
 * Two separate things were cutting the labels off, and reserving the inset
 * only fixed one of them.
 *
 * The first is the system bar: the app draws edge to edge, so on a phone with
 * gesture navigation it sits *over* the bottom of the window. The inset is
 * reserved, but with a floor under it — a phone with hardware buttons reports
 * no inset at all, and the labels still want air beneath them.
 *
 * The second is the label itself. It is a shrinkable flex item, so when the
 * icon and the label together came to more than the row had, the label
 * absorbed the whole shortfall: an 11pt label squashed into a 9pt box that
 * clips `overflow: hidden`. Descenders went first, which is why "Settings"
 * looked cut and "Calendar" did not. An explicit `lineHeight` gives the text
 * a floor of its own, and the bar is tall enough that nothing has to shrink
 * to begin with.
 */
function AppTabs() {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, space.md);
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: p.page },
        headerTitleStyle: { color: p.text },
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: p.page },
        tabBarStyle: {
          backgroundColor: p.surface,
          borderTopColor: p.line,
          height: TAB_BAR_HEIGHT + bottomPad,
          paddingTop: space.sm,
          paddingBottom: bottomPad,
        },
        tabBarActiveTintColor: p.brand,
        tabBarLabelStyle: { fontSize: 11, lineHeight: 15, fontWeight: '600' },
        tabBarInactiveTintColor: p.muted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Calendar',
          // The brand band carries the month and the navigation, so a
          // second bar above it saying "Calendar" only steals height.
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="calendar-month" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="income"
        options={{
          title: 'Money in',
          tabBarLabel: 'Income',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="hand-coin" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="payments"
        options={{
          title: 'Money out',
          tabBarLabel: 'Payments',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="receipt-text" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="cog" color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

/**
 * Icon, gap and label, before the bottom padding is added underneath. Leaves
 * slack over the 48pt the row actually measures, so a larger system font
 * scale grows the label instead of clipping it.
 */
const TAB_BAR_HEIGHT = 62;

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <BudgetProvider>
        <StatusBar style="auto" />
        <AppTabs />
      </BudgetProvider>
    </SafeAreaProvider>
  );
}
