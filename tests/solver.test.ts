import { describe, expect, it } from 'vitest';
import { solveGreedy } from '../src/solver/greedy';

describe('greedy crossword solver', () => {
  it('returns an empty result for an empty input', () => {
    const result = solveGreedy([]);
    expect(result.grid.placements).toEqual([]);
    expect(result.unplaced).toEqual([]);
  });

  it('places the longest entry first', () => {
    const result = solveGreedy([
      { answer: 'CHAT' },
      { answer: 'MAISON' },
      { answer: 'SOURIS' },
    ]);

    expect(result.grid.placements[0]?.entry.answer).toBe('MAISON');
    expect(result.grid.placements[0]?.direction).toBe('across');
    expect(result.grid.placements[0]?.start).toEqual({ row: 0, col: 0 });
  });

  it('places entries through valid matching intersections', () => {
    const result = solveGreedy([
      { answer: 'MAISON' },
      { answer: 'SOURIS' },
      { answer: 'RAISON' },
    ]);

    expect(result.grid.placements.length).toBeGreaterThanOrEqual(2);
    expect(result.grid.placements.slice(1).every(({ direction }) => direction === 'down')).toBe(true);
  });

  it('reports entries that cannot be connected without inventing filler', () => {
    const result = solveGreedy([
      { answer: 'CHAT' },
      { answer: 'LYNX' },
    ]);

    expect(result.grid.placements).toHaveLength(1);
    expect(result.unplaced.map(({ answer }) => answer)).toEqual(['LYNX']);
  });

  it('is deterministic for the same input', () => {
    const entries = [
      { answer: 'MAISON' },
      { answer: 'SOURIS' },
      { answer: 'RAISON' },
      { answer: 'MORSE' },
    ];

    expect(solveGreedy(entries)).toEqual(solveGreedy(entries));
  });
});
