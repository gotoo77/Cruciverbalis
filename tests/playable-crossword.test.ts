import { describe, expect, it } from 'vitest';
import { createEmptyGrid, placeEntry } from '../src/core/grid';
import type { DomainGrid, Entry } from '../src/core/domain';
import {
  CLUE_SET_SCHEMA,
  type ClueSet,
} from '../src/artifacts/clue-set';
import {
  PLAYABLE_CROSSWORD_SCHEMA,
  composePlayableCrossword,
  parsePlayableCrosswordJson,
  serializePlayableCrossword,
} from '../src/artifacts/playable-crossword';

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

const clues: ClueSet = {
  schema: CLUE_SET_SCHEMA,
  id: 'fruit-clues-v1',
  name: 'Fruits',
  language: 'fr',
  clues: [
    { id: 'melon-definition', answer: 'MELON', kind: 'definition', text: 'Fruit rond à chair parfumée.' },
    { id: 'pasteque-definition', answer: 'PASTEQUE', kind: 'definition', text: 'Gros fruit riche en eau.' },
    { id: 'pasteque-wordplay', answer: 'PASTÈQUE', kind: 'wordplay', text: 'Elle a le cœur rouge mais ne bat jamais.', difficulty: 3 },
  ],
};

describe('PlayableCrossword v1', () => {
  it('composes geometry with one selected clue per answer', () => {
    const grid = gridWith(
      { answer: 'MELON', row: 0, col: 0, direction: 'across' },
      { answer: 'PASTEQUE', row: 0, col: 1, direction: 'down' },
    );

    const result = composePlayableCrossword(grid, clues, {
      id: 'fruit-demo',
      name: 'Démo fruits',
      wordSetId: 'fruit-words-v1',
      clueSelections: [{ answer: 'PASTÈQUE', clueId: 'pasteque-wordplay' }],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.schema).toBe(PLAYABLE_CROSSWORD_SCHEMA);
    expect(result.value.clueSetId).toBe('fruit-clues-v1');
    expect(result.value.entries).toHaveLength(2);
    expect(result.value.entries[0]?.clue.id).toBe('melon-definition');
    expect(result.value.entries[1]?.clue).toMatchObject({
      id: 'pasteque-wordplay',
      kind: 'wordplay',
      difficulty: 3,
    });
  });

  it('requires an explicit choice when several clues fit the same answer', () => {
    const grid = gridWith({ answer: 'PASTEQUE', row: 0, col: 0, direction: 'across' });
    const result = composePlayableCrossword(grid, clues, { id: 'ambiguous', name: 'Ambiguous' });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues[0]?.message).toContain('explicit clue selection');
  });

  it('rejects a clue selection that belongs to another answer', () => {
    const grid = gridWith({ answer: 'PASTEQUE', row: 0, col: 0, direction: 'across' });
    const result = composePlayableCrossword(grid, clues, {
      id: 'bad-selection',
      name: 'Bad selection',
      clueSelections: [{ answer: 'PASTEQUE', clueId: 'melon-definition' }],
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues[0]?.message).toContain('does not match PASTEQUE');
  });

  it('round-trips the self-contained playable artifact through JSON', () => {
    const grid = gridWith({ answer: 'MELON', row: 2, col: -3, direction: 'across' });
    const composed = composePlayableCrossword(grid, clues, { id: 'roundtrip', name: 'Round trip' });
    expect(composed.ok).toBe(true);
    if (!composed.ok) return;

    const parsed = parsePlayableCrosswordJson(serializePlayableCrossword(composed.value));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value).toEqual(composed.value);
  });
});
