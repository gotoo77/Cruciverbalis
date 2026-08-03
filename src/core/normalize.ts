import type { WordEntry } from './types';

export function normalizeAnswer(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z]/g, '')
    .toUpperCase();
}

export function normalizeEntries(entries: WordEntry[]): WordEntry[] {
  const seen = new Set<string>();

  return entries.flatMap((entry) => {
    const answer = normalizeAnswer(entry.answer);
    if (answer.length < 2 || seen.has(answer)) return [];
    seen.add(answer);
    return [{ ...entry, answer }];
  });
}
