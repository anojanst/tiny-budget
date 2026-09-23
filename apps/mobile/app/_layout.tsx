import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { ColorValue } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BudgetProvider } from '../src/BudgetProvider';
import { space, usePalette } from '../src/theme';

/**
 * The selected tab fills in rather than only changing colour, so the current
 * place is legible without relying on hue.
 */
function TabIcon({
  name,
  color,
  focused,
  size = 25,
}: {
  name: keyof typeof MaterialCommunityIcons.glyphMap;
  color: ColorValue;
  focused: boolean;
  size?: number;
}) {
  return (
    <MaterialCommunityIcons
      name={focused ? name : (`${name}-outline` as typeof name)}
      size={size}
      color={color as string}
    />
  );
}

/**
 * Split out so it can read the safe-area insets, which only exist inside the
 * provider.
 *
 * The app draws edge to edge, so on a phone with gesture navigation the system
 * bar sits *over* the bottom of the window. Without reserving that strip the
 * tab bar's labels end up underneath it and read as cut off, which is exactly
 * what they were. The bar is given a real height too: the default assumes a
 * smaller glyph than these icons, so the label had nowhere to go.
 */
function AppTabs() {
  const p = usePalette();
  const insets = useSafeAreaInsets();
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
          height: TAB_BAR_HEIGHT + insets.bottom,
          paddingTop: space.sm,
          paddingBottom: insets.bottom,
        },
        tabBarActiveTintColor: p.brand,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginBottom: space.xs },
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
        name="money"
        options={{
          title: 'Money in & out',
          tabBarLabel: 'In & out',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="swap-vertical-circle" color={color} focused={focused} />
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

/** Icon, gap and label, before any system inset is added underneath. */
const TAB_BAR_HEIGHT = 60;

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
