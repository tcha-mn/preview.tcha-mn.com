import type { PortableTextBlock } from '@portabletext/types';

export interface PerformanceDateWithNote<T> {
  date: T;
  note: PortableTextBlock[];
}

export interface PerformanceDateMarker<T> {
  date: T;
  marker?: number;
  index: number;
}

export interface PerformanceFootnote {
  marker: number;
  note: PortableTextBlock[];
}

export interface PerformanceDateNotes<T> {
  performanceDates: PerformanceDateMarker<T>[];
  footnotes: PerformanceFootnote[];
}

function removeTransientKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(removeTransientKeys);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => key !== '_key')
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, removeTransientKeys(child)])
    );
  }

  return value;
}

function getNoteKey(note: PortableTextBlock[]): string {
  return JSON.stringify(removeTransientKeys(note));
}

export function getPerformanceDateNotes<T>(dates: PerformanceDateWithNote<T>[]): PerformanceDateNotes<T> {
  const noteMarkers = new Map<string, number>();
  const footnotes: PerformanceFootnote[] = [];
  const performanceDates = dates.map((performance, index) => {
    if (!performance.note.length) {
      return { date: performance.date, marker: undefined, index };
    }

    const noteKey = getNoteKey(performance.note);
    let marker = noteMarkers.get(noteKey);

    if (marker === undefined) {
      marker = footnotes.length + 1;
      noteMarkers.set(noteKey, marker);
      footnotes.push({ marker, note: performance.note });
    }

    return { date: performance.date, marker, index };
  });

  return { performanceDates, footnotes };
}
