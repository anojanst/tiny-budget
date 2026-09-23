import { execFileSync } from 'child_process';
import { writeFileSync, mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it } from 'vitest';

/**
 * The distribution list is the one input to a release that nothing else
 * checks. A malformed address does not fail loudly — it fails fifteen minutes
 * into a build, after the APK is already signed, or worse, quietly leaves
 * somebody off and nobody notices until they say they never got the app.
 *
 * These run in `npm test`, which the release workflow runs *before* it builds,
 * so a bad list stops the release in under a minute.
 */
const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(HERE, '../scripts/testers.sh');
const LIST = join(HERE, '../testers.txt');

/** The list exactly as the workflow sees it — same script, same output. */
function parse(file = LIST): string[] {
  const out = execFileSync('bash', [SCRIPT, file], { encoding: 'utf8' });
  return out.split('\n').filter(Boolean);
}

function withList(contents: string): string[] {
  const dir = mkdtempSync(join(tmpdir(), 'testers-'));
  const file = join(dir, 'testers.txt');
  writeFileSync(file, contents);
  return parse(file);
}

describe('the distribution list', () => {
  const addresses = parse();

  it('has somebody on it', () => {
    // An empty list means a release that reaches nobody, which looks exactly
    // like a successful release from the outside.
    expect(addresses.length).toBeGreaterThan(0);
  });

  it.each(addresses)('%s is a usable address', (address) => {
    // Deliberately loose. The job is to catch a typo or a stray character
    // that would make Firebase reject the whole batch, not to adjudicate
    // what RFC 5322 permits.
    expect(address).toMatch(/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i);
  });

  it('lists nobody twice', () => {
    const lower = addresses.map((a) => a.toLowerCase());
    expect(new Set(lower).size).toBe(lower.length);
  });

  it('carries no annotation into the addresses', () => {
    // That stripping works at all is pinned below against a fixture; this
    // only says the real file came through it clean.
    expect(addresses.some((a) => a.includes('#') || /\s/.test(a))).toBe(false);
  });
});

describe('reading the list', () => {
  it('drops comments, blank lines and stray whitespace', () => {
    expect(
      withList(
        [
          '# who gets it',
          '',
          '  spaced@example.com  ',
          'trailing@example.com # a note about them',
          '',
          '# nobody here',
          'last@example.com',
        ].join('\n'),
      ),
    ).toEqual(['spaced@example.com', 'trailing@example.com', 'last@example.com']);
  });

  it('reports an all-comments list as empty rather than failing', () => {
    // The workflow turns "empty" into a clear error of its own; the script
    // exiting non-zero here would surface as an opaque step failure instead.
    expect(withList('# everyone removed\n\n')).toEqual([]);
  });

  it('fails loudly when the list is missing', () => {
    expect(() => parse(join(tmpdir(), 'definitely-not-here.txt'))).toThrow();
  });
});
