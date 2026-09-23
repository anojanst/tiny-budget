import { useColorScheme } from 'react-native';

/**
 * One hue drives the accent, the greys and the borders together, the same way
 * the web app's themes work — so the two clients look like one product rather
 * than two takes on it.
 */
const light = {
  bg: '#f7f7f5',
  card: '#ffffff',
  border: '#e6e5e1',
  text: '#1a1a18',
  muted: '#6f6e69',
  primary: '#128a5b',
  primaryText: '#ffffff',
  accentBg: '#eaf6f0',
  danger: '#b3261e',
  dangerBg: '#fdeceb',
  shadow: '#000000',
};

const dark = {
  bg: '#141513',
  card: '#1c1d1b',
  border: '#2c2e2b',
  text: '#f2f2ef',
  muted: '#9b9b94',
  primary: '#3ec98b',
  primaryText: '#0b1710',
  accentBg: '#16291f',
  danger: '#ff8a80',
  dangerBg: '#2a1615',
  shadow: '#000000',
};

export type Palette = typeof light;

export function usePalette(): Palette {
  return useColorScheme() === 'dark' ? dark : light;
}

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };
export const radius = { sm: 8, md: 12, lg: 16 };
