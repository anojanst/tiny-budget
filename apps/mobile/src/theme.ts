import { useColorScheme } from 'react-native';

/**
 * The palette is a depth gauge, not decoration.
 *
 * Most budgeting apps are fintech blue, which is the colour of a bank rather
 * than of your own money, and they reserve red for a rare error state. This
 * app's most important screen is often the one telling you that you run out on
 * the 14th, so "running low" and "under" are first-class colours here, sharing
 * one scale with "fine": deep water, shallows, aground.
 */
const light = {
  /** The hero's ground — deep water, where there's plenty under the keel. */
  deep: '#0C2522',
  onDeep: '#E8F2EE',
  onDeepMuted: '#8FA9A1',

  paper: '#F1F4F2',
  surface: '#FFFFFF',
  line: '#E2E7E4',
  text: '#0F1A17',
  muted: '#5D6B65',

  /** Money arriving, and any balance that is comfortably clear. */
  tide: '#0E9B6C',
  tideWash: '#E4F3EC',
  /** Getting shallow — a warning that is not yet a failure. */
  shoal: '#B5730C',
  shoalWash: '#FBF0DC',
  /** Under. */
  aground: '#B3261E',
  agroundWash: '#FBE9E7',
};

const dark: typeof light = {
  // In dark the hero has to read as *raised*, so it sits lighter and bluer
  // than the page rather than darker — the light-mode trick of going darker
  // than the paper inverts here and the panel disappears.
  deep: '#0D2F2A',
  onDeep: '#E8F2EE',
  onDeepMuted: '#86A39B',

  paper: '#090D0C',
  surface: '#141B19',
  line: '#242E2A',
  text: '#ECF2EF',
  muted: '#94A29C',

  tide: '#3FCB97',
  tideWash: '#12291F',
  shoal: '#E0A44A',
  shoalWash: '#2A2112',
  aground: '#FF8A80',
  agroundWash: '#2B1614',
};

export type Palette = typeof light;

export function usePalette(): Palette {
  return useColorScheme() === 'dark' ? dark : light;
}

/** A 4pt rhythm; `xl` is the gap between whole sections, nothing smaller. */
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 28 };

/**
 * Radius carries hierarchy rather than being one value everywhere: the hero is
 * the softest shape on screen, controls are crisper, chips crisper still.
 */
export const radius = { chip: 8, control: 12, card: 18, hero: 26 };

export const type = {
  hero: { fontSize: 44, fontWeight: '700' as const, letterSpacing: -1.4 },
  figure: { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.4 },
  title: { fontSize: 17, fontWeight: '600' as const, letterSpacing: -0.2 },
  body: { fontSize: 15, fontWeight: '400' as const },
  label: { fontSize: 13, fontWeight: '500' as const },
  small: { fontSize: 12, fontWeight: '400' as const },
};
