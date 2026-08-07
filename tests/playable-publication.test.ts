import { describe, expect, it } from 'vitest';
import { preflightPlayablePublication } from '../src/artifacts/playable-publication';
import { CLUE_SET_SCHEMA, type ClueSet } from '../src/artifacts/clue-set';
import { PLAYABLE_CROSSWORD_SCHEMA, type PlayableCrossword } from '../src/artifacts/playable-crossword';

const crossword: PlayableCrossword = {
  schema: PLAYABLE_CROSSWORD_SCHEMA,
  id: 'test-crossword',
  name: 'Grille de test',
  language: 'fr',
  clueSetId: 'clues-fr',
  entries: [
    {
      id: 'entry-1', answer: 'CHAT', row: 0, col: 0, direction: 'across',
      clue: { id: 'embedded-chat', kind: 'definition', text: 'Indice CHAT' },
    },
    {
      id: 'entry-2', answer: 'ETE', row: 0, col: 1, direction: 'down',
      clue: { id: 'embedded-ete', kind: 'definition', text: 'Indice ETE' },
    },
  ],
};

function clues(id: string, answers: readonly string[]): ClueSet {
  return {
    schema: CLUE_SET_SCHEMA,
    id,
    name: 'Indices',
    language: 'fr',
    clues: answers.map((answer, index) => ({
      id: `clue-${index}`,
      answer,
      kind: 'definition',
      text: `Indice ${answer}`,
    })),
  };
}

describe('preflight de publication', () => {
  it('refuse une grille dont une réponse finale reste sans indice', () => {
    const result = preflightPlayablePublication(crossword, clues('clues-fr', ['CHAT']));

    expect(result.publishable).toBe(false);
    expect(result.issues).toContainEqual(expect.objectContaining({ code: 'missing-clue', answer: 'ETE' }));
  });

  it('refuse un ClueSet différent de celui référencé par la grille', () => {
    const result = preflightPlayablePublication(crossword, clues('autres-clues', ['CHAT', 'ETE']));

    expect(result.publishable).toBe(false);
    expect(result.issues).toContainEqual(expect.objectContaining({ code: 'clue-set-mismatch' }));
  });

  it('autorise une grille entièrement couverte par son ClueSet déclaré', () => {
    expect(preflightPlayablePublication(crossword, clues('clues-fr', ['CHAT', 'ÉTÉ']))).toEqual({
      publishable: true,
      issues: [],
    });
  });
});
