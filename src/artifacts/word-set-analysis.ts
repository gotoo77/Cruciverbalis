import type { WordSet } from './word-set';

export type WordSetDifficulty = 'easy' | 'medium' | 'hard';
export type SearchComplexity = 'low' | 'moderate' | 'high' | 'experimental';

export interface WordSetAnalysis {
  readonly entryCount: number;
  readonly minLength: number;
  readonly maxLength: number;
  readonly averageLength: number;
  readonly uniqueLetters: readonly string[];
  readonly rareLetters: readonly string[];
  readonly averageSharedLetters: number;
  readonly isolatedEntries: readonly string[];
  readonly connectedComponents: readonly (readonly string[])[];
  readonly largestComponentSize: number;
  readonly connectivityRatio: number;
  readonly estimatedComplexity: SearchComplexity;
  readonly recommendedMaxNodes: number;
  readonly recommendedMaximumEntries: number;
  readonly warnings: readonly string[];
  readonly difficulty: WordSetDifficulty;
}

const normalize = (answer: string): string =>
  answer
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleUpperCase('fr-FR')
    .replace(/[^A-Z]/g, '');

const letterSet = (answer: string): ReadonlySet<string> => new Set(normalize(answer));

function shareLetter(left: string, right: string): boolean {
  const rightLetters = letterSet(right);
  return [...letterSet(left)].some((letter) => rightLetters.has(letter));
}

function connectedComponents(entries: readonly string[]): string[][] {
  const visited = new Set<number>();
  const components: string[][] = [];

  for (let start = 0; start < entries.length; start += 1) {
    if (visited.has(start)) continue;
    const queue = [start];
    const component: string[] = [];
    visited.add(start);

    while (queue.length > 0) {
      const current = queue.shift();
      if (current === undefined) break;
      const word = entries[current];
      if (word) component.push(word);

      for (let candidate = 0; candidate < entries.length; candidate += 1) {
        if (visited.has(candidate) || candidate === current) continue;
        if (shareLetter(entries[current] ?? '', entries[candidate] ?? '')) {
          visited.add(candidate);
          queue.push(candidate);
        }
      }
    }

    components.push(component.sort());
  }

  return components.sort((left, right) => right.length - left.length || left.join('|').localeCompare(right.join('|')));
}

function estimateComplexity(entryCount: number, connectivityRatio: number, averageSharedLetters: number): SearchComplexity {
  if (entryCount >= 26) return 'experimental';
  if (entryCount >= 19 || (entryCount >= 15 && averageSharedLetters >= 8)) return 'high';
  if (entryCount >= 13 || connectivityRatio < 0.8) return 'moderate';
  return 'low';
}

function budgetFor(complexity: SearchComplexity): number {
  switch (complexity) {
    case 'low': return 100_000;
    case 'moderate': return 250_000;
    case 'high': return 500_000;
    case 'experimental': return 1_000_000;
  }
}

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

  const components = connectedComponents(normalized);
  const largestComponentSize = components[0]?.length ?? 0;
  const connectivityRatio = normalized.length === 0 ? 1 : largestComponentSize / normalized.length;
  const estimatedComplexity = estimateComplexity(normalized.length, connectivityRatio, averageSharedLetters);
  const warnings: string[] = [];

  if (normalized.length < 6) warnings.push('Moins de 6 mots thématiques : la grille risque de manquer de substance.');
  if (normalized.length > 20) warnings.push('Plus de 20 mots thématiques : la recherche interactive peut devenir coûteuse.');
  if (normalized.length > 30) warnings.push('Plus de 30 mots thématiques : utiliser une stratégie approximative ou fractionner le corpus.');
  if (isolatedEntries.length > 0) warnings.push(`${isolatedEntries.length} mot(s) ne partagent aucune lettre avec les autres.`);
  if (components.length > 1) warnings.push(`Le graphe lexical contient ${components.length} composantes ; une grille connexe complète peut être impossible.`);

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
    connectedComponents: components,
    largestComponentSize,
    connectivityRatio,
    estimatedComplexity,
    recommendedMaxNodes: budgetFor(estimatedComplexity),
    recommendedMaximumEntries: 20,
    warnings,
    difficulty,
  };
}
