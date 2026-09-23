import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { ColorValue } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BudgetProvider } from '../src/BudgetProvider';
import { usePalette } from '../src/theme';

/**
 * The selected tab fills in rather than only changing colour, so the current
 * place is legible without relying on hue.
 */
function TabIcon({
  name,
  color,
  focused,
  size = 26,
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

export default function RootLayout() {
  const p = usePalette();
  return (
    <SafeAreaProvider>
      <BudgetProvider>
        <StatusBar style="auto" />
        <Tabs
          screenOptions={{
            headerStyle: { backgroundColor: p.page },
            headerTitleStyle: { color: p.text },
            headerShadowVisible: false,
            sceneStyle: { backgroundColor: p.page },
            tabBarStyle: { backgroundColor: p.surface, borderTopColor: p.line },
            tabBarActiveTintColor: p.brand,
            tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
            tabBarItemStyle: { paddingTop: 4 },
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
      </BudgetProvider>
    </SafeAreaProvider>
  );
}
