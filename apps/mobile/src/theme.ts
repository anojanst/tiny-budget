import { useColorScheme } from 'react-native';

/**
 * Yellow and black, on warm white.
 *
 * Yellow is a field colour, never an ink. Black on yellow is one of the
 * highest-contrast pairs there is; yellow on white is one of the worst, and
 * four places in this app used the brand colour as text or as an icon on a
 * pale ground. `brandInk` exists for those — a dark amber that reads as the
 * same identity but is legible where the yellow is not. If you find yourself
 * writing `color: p.brand`, you almost certainly want `p.brandInk`.
 *
 * Everything else stays quiet: white cards on a warm ground, pastel washes
 * behind icons. The state colours are tints rather than alarms on purpose.
 * This app sometimes tells people they run out of money on the 14th, and it
 * should do that clearly without shouting — the shortfall is common, not
 * exceptional.
 */
const light = {
  /** The brand band. A field to put black on, never a colour to write in. */
  brand: '#FFCB45',
  brandDeep: '#F2A007',
  /** Dark amber: the brand identity where it has to survive on white. */
  brandInk: '#8A5800',
  onBrand: '#1A1A17',
  onBrandMuted: '#6E5512',
  brandWash: '#FFF4D9',

  page: '#FAF8F2',
  surface: '#FFFFFF',
  line: '#EDE9E0',
  text: '#1A1A17',
  muted: '#77726A',

  /**
   * The three states. Each is dark enough to clear 4.5:1 on white, because
   * the line they colour is 12pt — the most important sentence on the screen
   * is also the smallest, and a cheerful mid-tone green fails it.
   */
  /** Money arriving, and a balance that is comfortably clear. */
  mint: '#0E7F5C',
  mintWash: '#E2F3EC',
  /** Getting thin — a warning that is not yet a failure. */
  peach: '#9E5210',
  peachWash: '#FAEBDC',
  /** Under. */
  rose: '#C43F3B',
  roseWash: '#FBE9E8',
  /** A neutral wash for the quiet action. */
  slateWash: '#F1EEE6',
};

const dark: typeof light = {
  brand: '#F5B72E',
  brandDeep: '#D9930A',
  brandInk: '#F0B93F',
  onBrand: '#1A1A17',
  onBrandMuted: '#5E4A12',
  brandWash: '#3A2E12',

  page: '#14130F',
  surface: '#1F1D18',
  line: '#312D25',
  text: '#F2EFE7',
  muted: '#A19B8F',

  mint: '#43CFA1',
  mintWash: '#14302A',
  peach: '#F0A85C',
  peachWash: '#33261A',
  rose: '#F58089',
  roseWash: '#361D22',
  slateWash: '#282520',
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
