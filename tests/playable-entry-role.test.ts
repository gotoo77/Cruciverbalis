import { describe, expect, it } from 'vitest';
import {
  CLUE_SET_SCHEMA,
  PLAYABLE_CROSSWORD_SCHEMA,
  WORD_SET_SCHEMA,
  classifyPlayableEntries,
  composePlayableCrosswordFromArtifacts,
  type ClueSet,
  type WordSet,
} from '../src/api';
import { createEmptyGrid, placeEntry } from '../src/core/grid';
import type { DomainGrid, Entry } from '../src/core/domain';

function gridWith(...placements: Array<{ answer: string; row: number; col: number; direction: 'across' | 'down' }>): DomainGrid {
  let grid = createEmptyGrid();
  for (const placement of placements) {
    const entry: Entry = { answer: placement.answer };
    const result = placeEntry(grid, {
      entry,
      start: { row: placement.row, col: placement.col },
      direction: placement.direction,
    });
    if (!result.ok) throw new Error(`invalid fixture: ${result.code}`);
    grid = result.grid;
  }
  return grid;
}

const words: WordSet = {
  schema: WORD_SET_SCHEMA,
  id: 'fruit-words-v1',
  name: 'Fruits',
  language: 'fr',
  entries: [{ answer: 'MELON' }, { answer: 'PASTÈQUE' }],
};

const clues: ClueSet = {
  schema: CLUE_SET_SCHEMA,
  id: 'fruit-clues-v1',
  name: 'Fruits',
  language: 'fr',
  clues: [
    { id: 'melon', answer: 'MELON', kind: 'definition', text: 'Fruit rond.' },
    { id: 'ete', answer: 'ETE', kind: 'definition', text: 'Saison chaude.' },
  ],
};

describe('rôle des entrées jouables', () => {
  it('distingue corpus thématique et mots ajoutés par remplissage', () => {
    const grid = gridWith(
      { answer: 'MELON', row: 0, col: 0, direction: 'across' },
      { answer: 'ETE', row: 0, col: 1, direction: 'down' },
    );
    const composed = composePlayableCrosswordFromArtifacts(grid, words, clues, {
      id: 'fruit-demo',
      name: 'Démo fruits',
    });

    expect(composed.ok).toBe(true);
    if (!composed.ok) return;

    const summary = classifyPlayableEntries(composed.value, words);
    expect(summary.thematicAnswers).toEqual(['MELON']);
    expect(summary.fillAnswers).toEqual(['ETE']);
    expect(summary.thematicCount).toBe(1);
    expect(summary.fillCount).toBe(1);
    expect(summary.entries.map(({ role }) => role)).toEqual(['thematic', 'fill']);
  });

  it('normalise accents et casse pour reconnaître un mot thématique', () => {
    const crossword = {
      schema: PLAYABLE_CROSSWORD_SCHEMA,
      id: 'accent',
      name: 'Accent',
      language: 'fr',
      wordSetId: words.id,
      clueSetId: clues.id,
      entries: [{
        id: 'entry-1',
        answer: 'PASTEQUE',
        row: 0,
        col: 0,
        direction: 'across' as const,
        clue: { id: 'x', kind: 'definition' as const, text: 'Fruit riche en eau.' },
      }],
    };

    const summary = classifyPlayableEntries(crossword, words);
    expect(summary.thematicAnswers).toEqual(['PASTEQUE']);
    expect(summary.fillAnswers).toEqual([]);
  });
});
