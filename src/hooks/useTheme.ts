import { useEffect } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { DEFAULT_THEME_ID, findTheme, themeCss } from '@/lib/themes';

const STORAGE_KEY = 'tiny-budget:theme';
const STYLE_ELEMENT_ID = 'tiny-budget-theme';

/**
 * Theme choice is a display preference, not budget data — it lives under its
 * own key so clearing a budget or importing someone else's doesn't change how
 * the app looks.
 */
export function useTheme() {
  const [themeId, setThemeId] = useLocalStorage<string>(STORAGE_KEY, DEFAULT_THEME_ID);
  const theme = findTheme(themeId);

  useEffect(() => {
    let style = document.getElementById(STYLE_ELEMENT_ID);
    if (!style) {
      style = document.createElement('style');
      style.id = STYLE_ELEMENT_ID;
      document.head.append(style);
    }
    style.textContent = themeCss(theme);
  }, [theme]);

  return { theme, themeId: theme.id, setThemeId };
}
