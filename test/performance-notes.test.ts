import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { PortableTextBlock } from '@portabletext/types';
import { getPerformanceDateNotes } from '../src/utils/performanceNotes.ts';

function note(key: string, text: string): PortableTextBlock[] {
  return [
    {
      _key: key,
      _type: 'block',
      children: [{ _key: `${key}-span`, _type: 'span', marks: [], text }],
      markDefs: [],
      style: 'normal',
    },
  ] as unknown as PortableTextBlock[];
}

test('reuses a marker and lists identical notes once', () => {
  const result = getPerformanceDateNotes([
    { date: 'first', note: note('first-note', 'ASL interpreted') },
    { date: 'second', note: note('second-note', 'ASL interpreted') },
  ]);

  assert.deepEqual(
    result.performanceDates.map(({ marker }) => marker),
    [1, 1]
  );
  assert.equal(result.footnotes.length, 1);
  assert.equal(result.footnotes[0].marker, 1);
});

test('assigns separate markers to different notes and leaves unannotated dates unmarked', () => {
  const result = getPerformanceDateNotes([
    { date: 'first', note: [] },
    { date: 'second', note: note('first-note', 'ASL interpreted') },
    { date: 'third', note: note('second-note', 'Relaxed performance') },
  ]);

  assert.deepEqual(
    result.performanceDates.map(({ marker }) => marker),
    [undefined, 1, 2]
  );
  assert.deepEqual(
    result.footnotes.map(({ marker }) => marker),
    [1, 2]
  );
});
