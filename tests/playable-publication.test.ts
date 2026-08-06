import { describe, expect, it } from 'vitest';
import { preflightPlayablePublication } from '../src/artifacts/playable-publication';
import type { ClueSet } from '../src/artifacts/clue-set';
import type { PlayableCrossword } from '../src/artifacts/playable-crossword';

const crossword = {
  clueSetId: 'clues-fr',
  entries: [
    { answer: 'CHAT' },
    { answer: 'ETE' },
  ],
} as PlayableCrossword;

function clues(id: string, answers: readonly string[]): ClueSet {
  return {
    schema: 'cruciverbalis/clue-set@1',
    id,
    name: 'Indices',
    language: 'fr',
    clues: answers.map((answer, index) => ({
      id: `clue-${index}`,
      answer,
      kind: 'definition',
      text: `Indice ${answer}`,
    })),
  } as ClueSet;
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
