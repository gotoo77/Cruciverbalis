import { describe, expect, it } from 'vitest';
import { analyzePlayableClueCoverage } from '../src/artifacts/playable-clue-coverage';
import type { ClueSet } from '../src/artifacts/clue-set';
import type { PlayableCrossword } from '../src/artifacts/playable-crossword';

const crossword = {
  entries: [
    { answer: 'CHAT', clue: { text: 'Félin domestique.' } },
    { answer: 'ETE', clue: { text: 'Saison chaude.' } },
  ],
} as PlayableCrossword;

function clueSet(answers: readonly string[]): ClueSet {
  return {
    schema: 'cruciverbalis/clue-set@1',
    id: 'test-clues',
    name: 'Indices de test',
    language: 'fr',
    clues: answers.map((answer, index) => ({
      id: `clue-${index}`,
      answer,
      kind: 'definition',
      text: `Indice pour ${answer}`,
    })),
  } as ClueSet;
}

describe('couverture éditoriale de la grille finale', () => {
  it('signale un mot FillPass sans indice même si les mots thématiques sont couverts', () => {
    const result = analyzePlayableClueCoverage(crossword, clueSet(['CHAT']));

    expect(result).toEqual({
      totalAnswers: 2,
      coveredAnswers: 1,
      missingAnswers: ['ETE'],
      coverage: 0.5,
      complete: false,
    });
  });

  it('est complète quand chaque entrée réellement jouée possède un indice', () => {
    const result = analyzePlayableClueCoverage(crossword, clueSet(['CHAT', 'ÉTÉ']));

    expect(result.missingAnswers).toEqual([]);
    expect(result.coverage).toBe(1);
    expect(result.complete).toBe(true);
  });
});
