import { useColorScheme } from 'react-native';

/**
 * Soft and light by default, with saturation spent only where it carries
 * meaning: the brand band at the top, and the three states of the headline
 * figure. Everything else is white cards on a pale ground and pastel washes
 * behind icons, so the screen stays calm even when the news on it is not.
 *
 * The state colours are tints rather than alarms on purpose. This app tells
 * people they run out of money on the 14th; it should do that clearly without
 * shouting, because the shortfall state is common, not exceptional.
 */
const light = {
  /** The brand band behind the top of the screen. */
  brand: '#3B74F6',
  brandDeep: '#2554D8',
  onBrand: '#FFFFFF',
  onBrandMuted: '#C7D8FF',
  brandWash: '#E9F0FF',

  page: '#F4F7FD',
  surface: '#FFFFFF',
  line: '#EAEEF6',
  text: '#16203A',
  muted: '#727E99',

  /** Money arriving, and a balance that is comfortably clear. */
  mint: '#17A47A',
  mintWash: '#E4F5EF',
  /** Getting thin — a warning that is not yet a failure. */
  peach: '#E08A3C',
  peachWash: '#FDF0E1',
  /** Under. */
  rose: '#E2606B',
  roseWash: '#FDEBEC',
  /** A neutral wash for the quiet action. */
  slateWash: '#EEF1F7',
};

const dark: typeof light = {
  brand: '#4C82FF',
  brandDeep: '#2B57C9',
  onBrand: '#FFFFFF',
  onBrandMuted: '#BFD3FF',
  brandWash: '#182541',

  page: '#0E1424',
  surface: '#182033',
  line: '#26304A',
  text: '#EAEFF9',
  muted: '#93A0BC',

  mint: '#43CFA1',
  mintWash: '#14302A',
  peach: '#F0A85C',
  peachWash: '#33261A',
  rose: '#F58089',
  roseWash: '#361D22',
  slateWash: '#222C44',
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
export const radius = { chip: 10, control: 14, card: 20, hero: 24 };

/**
 * Cards float rather than being outlined. A hairline border reads as a form
 * field — utilitarian, flat, everything at one depth — whereas a soft shadow
 * on a tinted ground is what makes a white card feel like an object you could
 * pick up. This is most of the difference between a tool and a product.
 */
export const shadow = {
  card: {
    shadowColor: '#0A1B3D',
    shadowOpacity: 0.07,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  hero: {
    shadowColor: '#0A1B3D',
    shadowOpacity: 0.13,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
} as const;

export const type = {
  hero: { fontSize: 38, fontWeight: '700' as const, letterSpacing: -1.1 },
  figure: { fontSize: 22, fontWeight: '700' as const, letterSpacing: -0.4 },
  section: { fontSize: 20, fontWeight: '700' as const, letterSpacing: -0.4 },
  title: { fontSize: 17, fontWeight: '600' as const, letterSpacing: -0.2 },
  body: { fontSize: 15, fontWeight: '400' as const },
  label: { fontSize: 13, fontWeight: '500' as const },
  small: { fontSize: 12, fontWeight: '400' as const },
};
