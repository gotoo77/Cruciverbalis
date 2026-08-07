import { describe, expect, it } from 'vitest';
import { analyzePlayableClueCoverage } from '../src/artifacts/playable-clue-coverage';
import { CLUE_SET_SCHEMA, type ClueSet } from '../src/artifacts/clue-set';
import { PLAYABLE_CROSSWORD_SCHEMA, type PlayableCrossword } from '../src/artifacts/playable-crossword';

const crossword: PlayableCrossword = {
  schema: PLAYABLE_CROSSWORD_SCHEMA,
  id: 'test-crossword',
  name: 'Grille de test',
  language: 'fr',
  clueSetId: 'test-clues',
  entries: [
    {
      id: 'entry-1',
      answer: 'CHAT',
      row: 0,
      col: 0,
      direction: 'across',
      clue: { id: 'embedded-chat', kind: 'definition', text: 'Félin domestique.' },
    },
    {
      id: 'entry-2',
      answer: 'ETE',
      row: 0,
      col: 1,
      direction: 'down',
      clue: { id: 'embedded-ete', kind: 'definition', text: 'Saison chaude.' },
    },
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
