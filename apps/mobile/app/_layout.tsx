import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Text, type ColorValue } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BudgetProvider } from '../src/BudgetProvider';
import { usePalette } from '../src/theme';

/** Text glyphs rather than an icon font: no extra asset, and they scale. */
function TabIcon({ glyph, color }: { glyph: string; color: ColorValue }) {
  return <Text style={{ color, fontSize: 18 }}>{glyph}</Text>;
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
            tabBarActiveTintColor: p.mint,
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
              tabBarIcon: ({ color }) => <TabIcon glyph="▦" color={color} />,
            }}
          />
          <Tabs.Screen
            name="money"
            options={{
              title: 'Money in & out',
              tabBarLabel: 'In & out',
              tabBarIcon: ({ color }) => <TabIcon glyph="⇄" color={color} />,
            }}
          />
          <Tabs.Screen
            name="settings"
            options={{
              title: 'Settings',
              tabBarIcon: ({ color }) => <TabIcon glyph="☰" color={color} />,
            }}
          />
        </Tabs>
      </BudgetProvider>
    </SafeAreaProvider>
  );
}
