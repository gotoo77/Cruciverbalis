import { describe, expect, it } from 'vitest';
import type { DomainGrid } from '../src/core/domain';
import { placeEntry } from '../src/core/grid';
import type { EditorialLockSet } from '../src/artifacts/editorial-lock-set';
import { candidatesForSlot, detectFillSlots, fillSeedGrid } from '../src/fill/fill-pass';

function bridgeSeed(): DomainGrid {
  return {
    cells: new Map([
      ['0,0', { letter: 'C', directions: new Set(['down' as const]) }],
      ['0,2', { letter: 'T', directions: new Set(['down' as const]) }],
    ]),
    placements: [],
  };
}

function lockedCatSeed(): { grid: DomainGrid; locks: EditorialLockSet } {
  const placed = placeEntry({ cells: new Map(), placements: [] }, {
    entry: { answer: 'CAT' },
    start: { row: 0, col: 0 },
    direction: 'across',
  });
  if (!placed.ok) throw new Error('expected CAT seed placement');
  return {
    grid: placed.grid,
    locks: {
      schema: 'cruciverbalis.editorial-lock-set.v1',
      id: 'locks-1',
      name: 'Human choices',
      locks: [{ kind: 'placement', answer: 'CAT', row: 0, col: 0, direction: 'across' }],
    },
  };
}

describe('FillPass v0', () => {
  it('detects constrained bridge slots without inventing a full block pattern', () => {
    const slots = detectFillSlots(bridgeSeed());
    expect(slots).toHaveLength(1);
    expect(slots[0]).toMatchObject({ direction: 'across', row: 0, col: 0, length: 3, pattern: 'C?T', anchors: 2 });
  });

  it('normalizes and filters dictionary candidates by the current pattern', () => {
    const [slot] = detectFillSlots(bridgeSeed());
    if (!slot) throw new Error('expected a fill slot');
    expect(candidatesForSlot(bridgeSeed(), slot, ['chat', 'côté', 'cat', 'cot', 'CAT'])).toEqual(['CAT', 'COT']);
  });

  it('fills a bridge with deterministic MRV/backtracking search', () => {
    const result = fillSeedGrid(bridgeSeed(), ['DOG', 'CAT']);
    expect(result.filled).toHaveLength(1);
    expect(result.filled[0]?.entry.answer).toBe('CAT');
    expect(result.grid.cells.get('0,1')?.letter).toBe('A');
    expect(result.stats.slotsFilled).toBe(1);
    expect(result.truncated).toBe(false);
    expect(result.editorialConflicts).toEqual([]);
  });

  it('leaves an impossible bridge explicit instead of forcing junk fill', () => {
    const result = fillSeedGrid(bridgeSeed(), ['DOG', 'EMU']);
    expect(result.filled).toHaveLength(0);
    expect(result.unfilled).toHaveLength(1);
    expect(result.grid.cells.size).toBe(2);
  });

  it('preserves a valid human placement lock during derivation', () => {
    const { grid, locks } = lockedCatSeed();
    const result = fillSeedGrid(grid, ['DOG', 'EMU'], { editorialLocks: locks });
    expect(result.editorialConflicts).toEqual([]);
    expect(result.grid.placements.some(({ entry }) => entry.answer === 'CAT')).toBe(true);
  });

  it('refuses derivation explicitly when the input has already violated a human lock', () => {
    const { locks } = lockedCatSeed();
    const result = fillSeedGrid(bridgeSeed(), ['CAT'], { editorialLocks: locks });
    expect(result.stats.nodesExplored).toBe(0);
    expect(result.filled).toEqual([]);
    expect(result.editorialConflicts).toHaveLength(1);
    expect(result.editorialConflicts[0]?.code).toBe('locked-placement-missing');
  });
});
