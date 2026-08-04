import type { WordSet } from './word-set';

export type WordSetDifficulty = 'easy' | 'medium' | 'hard';

export interface WordSetAnalysis {
  readonly entryCount: number;
  readonly minLength: number;
  readonly maxLength: number;
  readonly averageLength: number;
  readonly uniqueLetters: readonly string[];
  readonly rareLetters: readonly string[];
  readonly averageSharedLetters: number;
  readonly isolatedEntries: readonly string[];
  readonly difficulty: WordSetDifficulty;
}

const normalize = (answer: string): string =>
  answer
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleUpperCase('fr-FR')
    .replace(/[^A-Z]/g, '');

const letterSet = (answer: string): ReadonlySet<string> => new Set(normalize(answer));

export function analyzeWordSet(wordSet: WordSet): WordSetAnalysis {
  const normalized = wordSet.entries.map(({ answer }) => normalize(answer));
  const lengths = normalized.map((answer) => answer.length);
  const allLetters = [...new Set(normalized.flatMap((answer) => [...answer]))].sort();
  const rareLetters = allLetters.filter((letter) => 'JKQWXYZ'.includes(letter));

  const sharedCounts = normalized.map((answer, index) => {
    const letters = letterSet(answer);
    return normalized.reduce((count, candidate, candidateIndex) => {
      if (candidateIndex === index) return count;
      return [...letters].some((letter) => candidate.includes(letter)) ? count + 1 : count;
    }, 0);
  });

  const isolatedEntries = wordSet.entries
    .filter((_, index) => (sharedCounts[index] ?? 0) === 0)
    .map(({ answer }) => answer);

  const averageLength = lengths.length === 0
    ? 0
    : lengths.reduce((sum, length) => sum + length, 0) / lengths.length;
  const averageSharedLetters = sharedCounts.length === 0
    ? 0
    : sharedCounts.reduce((sum, count) => sum + count, 0) / sharedCounts.length;

  const difficultyScore =
    rareLetters.length * 1.5 +
    isolatedEntries.length * 3 +
    Math.max(0, averageLength - 7) +
    Math.max(0, 3 - averageSharedLetters);

  const difficulty: WordSetDifficulty = difficultyScore >= 7
    ? 'hard'
    : difficultyScore >= 3
      ? 'medium'
      : 'easy';

  return {
    entryCount: wordSet.entries.length,
    minLength: lengths.length === 0 ? 0 : Math.min(...lengths),
    maxLength: lengths.length === 0 ? 0 : Math.max(...lengths),
    averageLength,
    uniqueLetters: allLetters,
    rareLetters,
    averageSharedLetters,
    isolatedEntries,
    difficulty,
  };
}
