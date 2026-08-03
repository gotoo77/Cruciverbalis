import { describe, expect, it } from 'vitest';
import { generateGrid } from '../src/core/generate';
import { normalizeAnswer } from '../src/core/normalize';

describe('normalizeAnswer', () => {
  it('removes accents, spaces and punctuation', () => {
    expect(normalizeAnswer('Énergie propre !')).toBe('ENERGIEPROPRE');
  });
});

describe('generateGrid', () => {
  it('places at least two crossing compatible words', () => {
    const grid = generateGrid([
      { answer: 'NUCLEAIRE' },
      { answer: 'URANIUM' },
      { answer: 'ENERGIE' },
    ]);

    expect(grid.placements.length).toBeGreaterThanOrEqual(2);
    expect([...grid.cells.values()].some((cell) => cell.across && cell.down)).toBe(true);
  });

  it('reports words that cannot be placed instead of fabricating fillers', () => {
    const grid = generateGrid([{ answer: 'AAA' }, { answer: 'BBB' }]);
    expect(grid.placements).toHaveLength(1);
    expect(grid.unplaced).toHaveLength(1);
  });
});
