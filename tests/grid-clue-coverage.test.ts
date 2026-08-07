import { describe, expect, it } from 'vitest';
import { CLUE_SET_SCHEMA, type ClueSet } from '../src/artifacts/clue-set';
import { analyzeGridClueCoverage } from '../src/artifacts/grid-clue-coverage';
import type { DomainGrid } from '../src/core/domain';

const grid: DomainGrid = {
  cells: new Map(),
  placements: [
    { entry: { answer: 'CHAT' }, start: { row: 0, col: 0 }, direction: 'across' },
    { entry: { answer: 'ÉTÉ' }, start: { row: 0, col: 1 }, direction: 'down' },
  ],
};

function clueSet(answers: readonly string[]): ClueSet {
  return {
    schema: CLUE_SET_SCHEMA,
    id: 'test-clues',
    name: 'Indices de test',
    language: 'fr',
    clues: answers.map((answer, index) => ({
      id: `clue-${index}`,
      answer,
      kind: 'definition',
      text: `Indice pour ${answer}`,
    })),
  };
}

describe('couverture des indices avant composition', () => {
  it('signale les réponses placées sans indice avant de construire le PlayableCrossword', () => {
    expect(analyzeGridClueCoverage(grid, clueSet(['CHAT']))).toEqual({
      totalAnswers: 2,
      coveredAnswers: 1,
      missingAnswers: ['ETE'],
      coverage: 0.5,
      complete: false,
    });
  });

  it('normalise les accents comme le reste du pipeline', () => {
    const result = analyzeGridClueCoverage(grid, clueSet(['CHAT', 'ETE']));
    expect(result.complete).toBe(true);
    expect(result.missingAnswers).toEqual([]);
  });
});
