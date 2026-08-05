import { describe, expect, it } from 'vitest';
import type { DomainGrid } from '../src/core/domain';
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
  });

  it('leaves an impossible bridge explicit instead of forcing junk fill', () => {
    const result = fillSeedGrid(bridgeSeed(), ['DOG', 'EMU']);
    expect(result.filled).toHaveLength(0);
    expect(result.unfilled).toHaveLength(1);
    expect(result.grid.cells.size).toBe(2);
  });
});
