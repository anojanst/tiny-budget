import { readFileSync, readdirSync, type Dirent } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it } from 'vitest';

/**
 * Every icon this app names has to be one the font can actually draw.
 *
 * The glyph map that ships beside the font is a *name* list, and the app
 * treats it as the source of truth — but a name can be plausible, can even be
 * in the map, and still not render. `cash-plus-outline` does not exist at
 * all, and drew a literal "?" in the tab bar; that shipped because the icon
 * was chosen by reading the filled name and assuming the pair.
 *
 * So the check is against the font binary's own character map, not the JSON
 * beside it, and the names are scraped from the source rather than listed
 * here — a list would go stale the first time someone adds an icon.
 */
// `__dirname` does not exist here: Expo's base config treats every file as an
// ES module, and the `react-native` resolution condition does not expose the
// `node:` specifiers either — so this reads plainly, from `import.meta`.
const HERE = dirname(fileURLToPath(import.meta.url));
const FONT_ROOT = join(
  HERE,
  '../../../../node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons',
);
const APP_ROOT = join(HERE, '../..');

/** The codepoints the font can render, read from its `cmap` table. */
function fontCodepoints(file: string): Set<number> {
  const b = readFileSync(file);
  const tables = b.readUInt16BE(4);
  let cmap: number | null = null;
  for (let i = 0; i < tables; i++) {
    const rec = 12 + i * 16;
    if (b.toString('ascii', rec, rec + 4) === 'cmap') cmap = b.readUInt32BE(rec + 8);
  }
  if (cmap === null) throw new Error('font has no cmap table');

  const out = new Set<number>();
  const subtables = b.readUInt16BE(cmap + 2);
  for (let i = 0; i < subtables; i++) {
    const sub = cmap + b.readUInt32BE(cmap + 4 + i * 8 + 4);
    const format = b.readUInt16BE(sub);
    if (format === 4) {
      const segX2 = b.readUInt16BE(sub + 6);
      const ends = sub + 14;
      const starts = ends + segX2 + 2;
      const deltas = starts + segX2;
      const ranges = deltas + segX2;
      for (let s = 0; s < segX2 / 2; s++) {
        const end = b.readUInt16BE(ends + s * 2);
        const start = b.readUInt16BE(starts + s * 2);
        const delta = b.readInt16BE(deltas + s * 2);
        const rangeOff = b.readUInt16BE(ranges + s * 2);
        if (start === 0xffff) continue;
        for (let c = start; c <= end && c !== 0x10000; c++) {
          let g: number;
          if (rangeOff === 0) g = (c + delta) & 0xffff;
          else {
            const at = ranges + s * 2 + rangeOff + (c - start) * 2;
            if (at + 1 >= b.length) continue;
            g = b.readUInt16BE(at);
            if (g !== 0) g = (g + delta) & 0xffff;
          }
          if (g !== 0) out.add(c);
        }
      }
    } else if (format === 12) {
      const groups = b.readUInt32BE(sub + 12);
      for (let g = 0; g < groups; g++) {
        const o = sub + 16 + g * 12;
        const end = b.readUInt32BE(o + 4);
        for (let c = b.readUInt32BE(o); c <= end; c++) out.add(c);
      }
    }
  }
  return out;
}

const glyphMap: Record<string, number> = JSON.parse(
  readFileSync(join(FONT_ROOT, 'glyphmaps/MaterialCommunityIcons.json'), 'utf8'),
);
const drawable = fontCodepoints(join(FONT_ROOT, 'Fonts/MaterialCommunityIcons.ttf'));

const canDraw = (name: string) => name in glyphMap && drawable.has(glyphMap[name]);

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry: Dirent) => {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) return [];
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.tsx?$/.test(entry.name) && !entry.name.includes('.test.') ? [full] : [];
  });
}

/**
 * Icon names as the source writes them. `name=` is only read off an icon
 * element — a bare `name="income"` is a route on `Tabs.Screen`, not a glyph.
 */
function iconNamesIn(text: string): string[] {
  const found = new Set<string>();
  for (const m of text.matchAll(/\bicon=["']([a-z][a-z0-9-]*)["']/g)) found.add(m[1]);
  for (const m of text.matchAll(
    /<(?:TabIcon|MaterialCommunityIcons)\s+name=["']([a-z][a-z0-9-]*)["']/g,
  )) {
    found.add(m[1]);
  }
  for (const m of text.matchAll(/,\s*'([a-z][a-z0-9-]*)'\]/g)) found.add(m[1]);
  return [...found];
}

const used = new Map<string, string>();
for (const file of sourceFiles(join(APP_ROOT, 'src')).concat(sourceFiles(join(APP_ROOT, 'app')))) {
  for (const name of iconNamesIn(readFileSync(file, 'utf8'))) {
    if (!used.has(name)) used.set(name, file.slice(APP_ROOT.length + 1));
  }
}

describe('icon names', () => {
  it('scrapes a plausible number of names, so a broken scan fails loudly', () => {
    // A regex that stops matching would otherwise make every test below pass
    // by checking nothing at all.
    expect(used.size).toBeGreaterThan(20);
    // One of each shape the scraper has to catch: a tab icon, a bare
    // `<MaterialCommunityIcons>`, an `icon=` prop, and a rules-table entry.
    expect(used.has('calendar-month')).toBe(true);
    expect(used.has('calendar-blank')).toBe(true);
    expect(used.has('cash-plus')).toBe(true);
    expect(used.has('home-outline')).toBe(true);
    // And nothing that is a route rather than a glyph.
    expect(used.has('index')).toBe(false);
    expect(used.has('payments')).toBe(false);
  });

  it.each([...used.entries()])('the font can draw %s (used in %s)', (name) => {
    expect(canDraw(name)).toBe(true);
  });

  it('refuses a name that is only plausible', () => {
    // The exact bug this file exists for: read as "cash-plus has an outline",
    // rendered as "?".
    expect(canDraw('cash-plus')).toBe(true);
    expect(canDraw('cash-plus-outline')).toBe(false);
  });
});

/**
 * The tab bar fills its icon in when selected, by appending `-outline` for the
 * unselected state. `TabIcon` falls back to the filled glyph when no outline
 * exists, so a missing pair is not a crash — but it silently costs the
 * affordance, which is a design decision nobody should make by accident.
 */
describe('tab bar icons', () => {
  const layout = readFileSync(join(APP_ROOT, 'app/_layout.tsx'), 'utf8');
  const tabIcons = [...layout.matchAll(/<TabIcon\s+name="([a-z0-9-]+)"/g)].map((m) => m[1]);

  it('finds every tab', () => {
    expect(tabIcons).toHaveLength(4);
  });

  it.each(tabIcons)('%s has both a filled and an outline glyph', (name) => {
    expect(canDraw(name)).toBe(true);
    expect(canDraw(`${name}-outline`)).toBe(true);
  });
});
