import { describe, expect, it } from 'vitest';
import { DEFAULT_THEME_ID, THEMES, findTheme, themeCss } from './themes';

describe('findTheme', () => {
  it('falls back to the default rather than returning nothing', () => {
    expect(findTheme('does-not-exist').id).toBe(DEFAULT_THEME_ID);
    expect(findTheme(null).id).toBe(DEFAULT_THEME_ID);
  });

  it('returns the requested theme when it exists', () => {
    expect(findTheme('violet').label).toBe('Iris');
  });
});

describe('themeCss', () => {
  it('has unique ids and labels so the picker can never show a duplicate', () => {
    expect(new Set(THEMES.map((t) => t.id)).size).toBe(THEMES.length);
    expect(new Set(THEMES.map((t) => t.label)).size).toBe(THEMES.length);
  });

  it('retints every hue-carrying token, not just the brand colour', () => {
    // The bug this guards against: swapping only --primary leaves the greys,
    // borders and accent pills tinted with the previous theme's hue.
    const css = themeCss(findTheme('blue'));
    for (const token of [
      '--background',
      '--foreground',
      '--muted-foreground',
      '--accent',
      '--border',
      '--sidebar-accent',
    ]) {
      expect(css).toContain(token);
    }
    expect(css).not.toContain('150'); // the default green hue
  });

  it('drives the brand, ring and first chart slot from one colour', () => {
    const theme = findTheme('rose');
    const css = themeCss(theme);
    expect(css).toContain(`--primary: ${theme.primary}`);
    expect(css).toContain(`--ring: ${theme.primary}`);
    expect(css).toContain(`--chart-1: ${theme.primary}`);
  });

  it('emits both light and dark rules so a mode toggle keeps working', () => {
    const theme = findTheme('teal');
    const css = themeCss(theme);
    expect(css).toContain(':root {');
    expect(css).toContain('.dark {');
    expect(css).toContain(`--primary: ${theme.primaryDark}`);
  });

  it('produces balanced braces for every theme', () => {
    for (const theme of THEMES) {
      const css = themeCss(theme);
      expect((css.match(/{/g) ?? []).length).toBe((css.match(/}/g) ?? []).length);
    }
  });
});
