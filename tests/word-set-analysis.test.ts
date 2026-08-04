import { describe, expect, it } from 'vitest';
import { analyzeWordSet, WORD_SET_SCHEMA, type WordSet } from '../src/api';

const wordSet = (answers: readonly string[]): WordSet => ({
  schema: WORD_SET_SCHEMA,
  id: 'fixture',
  name: 'Fixture',
  language: 'fr',
  entries: answers.map((answer) => ({ answer })),
});

describe('WordSet analysis', () => {
  it('measures lengths and alphabet deterministically', () => {
    const analysis = analyzeWordSet(wordSet(['CHAT', 'TACHE', 'ÉTÉ']));

    expect(analysis.entryCount).toBe(3);
    expect(analysis.minLength).toBe(3);
    expect(analysis.maxLength).toBe(5);
    expect(analysis.averageLength).toBeCloseTo(4);
    expect(analysis.uniqueLetters).toEqual(['A', 'C', 'E', 'H', 'T']);
  });

  it('finds entries that share no letter with the rest', () => {
    const analysis = analyzeWordSet(wordSet(['CHAT', 'TACHE', 'LOUP']));

    expect(analysis.isolatedEntries).toEqual(['LOUP']);
    expect(analysis.averageSharedLetters).toBeCloseTo(2 / 3);
  });

  it('marks rare-letter-heavy disconnected sets as hard', () => {
    const analysis = analyzeWordSet(wordSet(['WOK', 'JAZZ', 'LYNX']));

    expect(analysis.rareLetters).toEqual(['J', 'K', 'W', 'X', 'Y', 'Z']);
    expect(analysis.difficulty).toBe('hard');
  });
});
