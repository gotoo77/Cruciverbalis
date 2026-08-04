import { describe, expect, it } from 'vitest';
import { createEmptyGrid, placeEntry } from '../src/core/grid';
import type { Direction, DomainGrid, Entry } from '../src/core/domain';
import {
  addToParetoFront,
  createParetoSolution,
  translationInvariantPlacementSignature,
} from '../src/solver/pareto';

function gridWith(
  placements: readonly { entry: Entry; row: number; col: number; direction: Direction }[],
): DomainGrid {
  let grid = createEmptyGrid();
  for (const { entry, row, col, direction } of placements) {
    const result = placeEntry(grid, { entry, start: { row, col }, direction });
    if (!result.ok) throw new Error(`invalid test fixture: ${result.code}`);
    grid = result.grid;
  }
  return grid;
}

describe('Pareto solution equivalence', () => {
  it('gives translated copies the same canonical signature', () => {
    const chat = { answer: 'CHAT' };
    const tache = { answer: 'TACHE' };
    const first = gridWith([
      { entry: chat, row: 0, col: 0, direction: 'across' },
      { entry: tache, row: 0, col: 3, direction: 'down' },
    ]);
    const translated = gridWith([
      { entry: chat, row: 7, col: -4, direction: 'across' },
      { entry: tache, row: 7, col: -1, direction: 'down' },
    ]);

    expect(translationInvariantPlacementSignature(translated)).toBe(
      translationInvariantPlacementSignature(first),
    );
  });

  it('does not treat a genuinely different topology as a translation', () => {
    const chat = { answer: 'CHAT' };
    const tache = { answer: 'TACHE' };
    const first = gridWith([
      { entry: chat, row: 0, col: 0, direction: 'across' },
      { entry: tache, row: 0, col: 3, direction: 'down' },
    ]);
    // Same words and orientations, but TACHE crosses the A at CHAT[2]
    // instead of the T at CHAT[3]. Both fixtures are valid, while their
    // relative placement cannot be obtained by translating the whole grid.
    const different = gridWith([
      { entry: chat, row: 0, col: 0, direction: 'across' },
      { entry: tache, row: 0, col: 2, direction: 'down' },
    ]);

    expect(translationInvariantPlacementSignature(different)).not.toBe(
      translationInvariantPlacementSignature(first),
    );
  });

  it('keeps only one Pareto representative for translated copies', () => {
    const chat = { answer: 'CHAT' };
    const tache = { answer: 'TACHE' };
    const first = gridWith([
      { entry: chat, row: 0, col: 0, direction: 'across' },
      { entry: tache, row: 0, col: 3, direction: 'down' },
    ]);
    const translated = gridWith([
      { entry: chat, row: 10, col: 10, direction: 'across' },
      { entry: tache, row: 10, col: 13, direction: 'down' },
    ]);

    const initial = addToParetoFront([], createParetoSolution(first, []));
    const deduplicated = addToParetoFront(initial, createParetoSolution(translated, []));

    expect(deduplicated).toBe(initial);
    expect(deduplicated).toHaveLength(1);
  });
});
