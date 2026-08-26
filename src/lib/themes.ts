/**
 * A theme is one hue plus a brand colour, not a palette. Every neutral in the
 * app — background, borders, muted text — carries a trace of the same hue, so
 * changing only `--primary` would leave green-tinted greys sitting under a
 * blue button. Deriving the whole set from one number keeps them in step.
 */
export interface Theme {
  id: string;
  label: string;
  /** oklch hue angle shared by the neutrals and the accent tints. */
  hue: number;
  /** Brand colour on the light surface; white text sits on it. */
  primary: string;
  /** Lighter counterpart for the dark surface, which takes dark text. */
  primaryDark: string;
}

export const THEMES: readonly Theme[] = [
  { id: 'green', label: 'Forest', hue: 150, primary: '#1b7f4c', primaryDark: '#34a76a' },
  { id: 'blue', label: 'Harbour', hue: 255, primary: '#2563c9', primaryDark: '#5b9bf0' },
  { id: 'teal', label: 'Lagoon', hue: 195, primary: '#0d7d8c', primaryDark: '#2ab8c4' },
  { id: 'violet', label: 'Iris', hue: 300, primary: '#7043c4', primaryDark: '#a78bfa' },
  { id: 'amber', label: 'Ochre', hue: 75, primary: '#9a6b00', primaryDark: '#d9a52a' },
  { id: 'rose', label: 'Rosewood', hue: 10, primary: '#c03a55', primaryDark: '#f08098' },
];

export const DEFAULT_THEME_ID = 'green';

export function findTheme(id: string | null): Theme {
  return THEMES.find((theme) => theme.id === id) ?? THEMES[0];
}

/**
 * Emits a stylesheet rather than inline styles so the `.dark` rules keep their
 * normal cascade weight — an inline style on the root would win against both
 * and pin the app to one mode.
 */
export function themeCss(theme: Theme): string {
  const { hue, primary, primaryDark } = theme;
  return `
:root {
  --background: oklch(0.964 0.005 ${hue});
  --foreground: oklch(0.21 0.015 ${hue});
  --card-foreground: oklch(0.21 0.015 ${hue});
  --popover-foreground: oklch(0.21 0.015 ${hue});
  --primary: ${primary};
  --secondary: oklch(0.955 0.014 ${hue});
  --secondary-foreground: oklch(0.32 0.05 ${hue});
  --muted: oklch(0.966 0.006 ${hue});
  --muted-foreground: oklch(0.535 0.022 ${hue});
  --accent: oklch(0.945 0.03 ${hue});
  --accent-foreground: oklch(0.3 0.06 ${hue});
  --border: oklch(0.912 0.008 ${hue});
  --input: oklch(0.912 0.008 ${hue});
  --ring: ${primary};
  --chart-1: ${primary};
  --sidebar-foreground: oklch(0.21 0.015 ${hue});
  --sidebar-primary: ${primary};
  --sidebar-accent: oklch(0.945 0.03 ${hue});
  --sidebar-accent-foreground: oklch(0.3 0.06 ${hue});
  --sidebar-border: oklch(0.912 0.008 ${hue});
  --sidebar-ring: ${primary};
}
.dark {
  --background: oklch(0.17 0.008 ${hue});
  --foreground: oklch(0.97 0.005 ${hue});
  --card: oklch(0.222 0.012 ${hue});
  --card-foreground: oklch(0.97 0.005 ${hue});
  --popover: oklch(0.222 0.012 ${hue});
  --popover-foreground: oklch(0.97 0.005 ${hue});
  --primary: ${primaryDark};
  --secondary: oklch(0.29 0.02 ${hue});
  --muted: oklch(0.28 0.016 ${hue});
  --muted-foreground: oklch(0.72 0.02 ${hue});
  --accent: oklch(0.32 0.035 ${hue});
  --ring: ${primaryDark};
  --chart-1: ${primaryDark};
  --sidebar: oklch(0.222 0.012 ${hue});
  --sidebar-primary: ${primaryDark};
  --sidebar-accent: oklch(0.32 0.035 ${hue});
  --sidebar-ring: ${primaryDark};
}`.trim();
}
