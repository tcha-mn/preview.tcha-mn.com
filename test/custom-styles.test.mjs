import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

test('dark theme headings use a light color token', () => {
  const styles = readFileSync(new URL('../src/components/CustomStyles.astro', import.meta.url), 'utf8');

  assert.match(styles, /--aw-color-text-heading:\s*rgb\(247 248 248\);/);
});
