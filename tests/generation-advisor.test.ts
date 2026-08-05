import { describe, expect, it } from 'vitest';
import { recommendGeneration } from '../src/generation-advisor';
import type { WordSetAnalysis } from '../src/api';

function analysis(overrides: Partial<WordSetAnalysis> = {}): WordSetAnalysis {
  return {
    entryCount: 10,
    minLength: 3,
    maxLength: 10,
    averageLength: 6,
    uniqueLetters: ['A'],
    rareLetters: [],
    averageSharedLetters: 4,
    isolatedEntries: [],
    connectedComponents: [['A']],
    largestComponentSize: 10,
    connectivityRatio: 1,
    estimatedComplexity: 'low',
    recommendedMaxNodes: 100_000,
    recommendedMaximumEntries: 20,
    warnings: [],
    difficulty: 'easy',
    ...overrides,
  };
}

describe('assistant de configuration de génération', () => {
  it('utilise le backtracking et le budget recommandé dans la zone interactive', () => {
    expect(recommendGeneration(analysis())).toMatchObject({
      strategy: 'backtracking',
      maxNodes: 100_000,
    });
  });

  it('conserve le backtracking avec un budget accru pour une recherche élevée', () => {
    expect(recommendGeneration(analysis({ estimatedComplexity: 'high', recommendedMaxNodes: 500_000 }))).toMatchObject({
      strategy: 'backtracking',
      maxNodes: 500_000,
    });
  });

  it('préfère une réponse gloutonne rapide pour un corpus expérimental', () => {
    expect(recommendGeneration(analysis({ estimatedComplexity: 'experimental', recommendedMaxNodes: 1_000_000 }))).toMatchObject({
      strategy: 'greedy',
      maxNodes: 1_000_000,
    });
  });
});
