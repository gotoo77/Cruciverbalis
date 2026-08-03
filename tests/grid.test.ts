import { describe, expect, it } from 'vitest';
import { createEmptyGrid, placeEntry } from '../src/core/grid';
import type { Placement } from '../src/core/domain';

function placement(
  answer: string,
  row: number,
  col: number,
  direction: Placement['direction'],
): Placement {
  return {
    entry: { answer },
    start: { row, col },
    direction,
  };
}

describe('crossword domain invariants', () => {
  it('accepts an empty grid', () => {
    const grid = createEmptyGrid();
    expect(grid.cells.size).toBe(0);
    expect(grid.placements).toEqual([]);
  });

  it('accepts crossing words when the shared letter matches', () => {
    const first = placeEntry(createEmptyGrid(), placement('CHAT', 0, 0, 'across'));
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const second = placeEntry(first.grid, placement('ARBRE', 0, 2, 'down'));
    expect(second.ok).toBe(true);
    if (!second.ok) return;

    expect(second.grid.placements).toHaveLength(2);
    expect(second.grid.cells.get('0,2')?.letter).toBe('A');
    expect(second.grid.cells.get('0,2')?.directions.size).toBe(2);
  });

  it('rejects conflicting letters at an intersection', () => {
    const first = placeEntry(createEmptyGrid(), placement('CHAT', 0, 0, 'across'));
    if (!first.ok) throw new Error('test setup failed');

    const second = placeEntry(first.grid, placement('OMBRE', -2, 2, 'down'));
    expect(second).toMatchObject({ ok: false, code: 'letter-conflict' });
  });

  it('rejects parallel overlap', () => {
    const first = placeEntry(createEmptyGrid(), placement('CHAT', 0, 0, 'across'));
    if (!first.ok) throw new Error('test setup failed');

    const second = placeEntry(first.grid, placement('HATE', 0, 1, 'across'));
    expect(second).toMatchObject({ ok: false, code: 'parallel-overlap' });
  });

  it('rejects words running side by side without crossing', () => {
    const first = placeEntry(createEmptyGrid(), placement('CHAT', 0, 0, 'across'));
    if (!first.ok) throw new Error('test setup failed');

    const second = placeEntry(first.grid, placement('LION', 1, 0, 'across'));
    expect(second).toMatchObject({ ok: false, code: 'adjacent-word' });
  });

  it('rejects entries touching at their ends', () => {
    const first = placeEntry(createEmptyGrid(), placement('CHAT', 0, 0, 'across'));
    if (!first.ok) throw new Error('test setup failed');

    const second = placeEntry(first.grid, placement('TIGRE', 0, 4, 'across'));
    expect(second).toMatchObject({ ok: false, code: 'touching-end' });
  });

  it('does not mutate the source grid', () => {
    const empty = createEmptyGrid();
    const result = placeEntry(empty, placement('CHAT', 0, 0, 'across'));

    expect(result.ok).toBe(true);
    expect(empty.cells.size).toBe(0);
    expect(empty.placements).toHaveLength(0);
  });
});
