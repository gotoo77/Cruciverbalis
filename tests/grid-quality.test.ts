import { describe, expect, it } from 'vitest';
import type { Entry, Placement } from '../src/core/domain';
import { createEmptyGrid, placeEntry } from '../src/core/grid';
import { dominates, measureGridQuality, paretoFront, type GridQuality } from '../src/quality/grid-quality';

function placement(answer: string, row: number, col: number, direction: 'across' | 'down'): Placement {
  const entry: Entry = { answer };
  return { entry, start: { row, col }, direction };
}

describe('grid quality', () => {
  it('measures an empty grid without inventing a scalar score', () => {
    expect(measureGridQuality(createEmptyGrid())).toEqual({
      placedEntries: 0,
      crossings: 0,
      area: 0,
      density: 0,
      directionBalance: 1,
    });
  });

  it('measures crossings, density and direction balance independently', () => {
    const first = placeEntry(createEmptyGrid(), placement('CHAT', 0, 0, 'across'));
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const second = placeEntry(first.grid, placement('ARBRE', 0, 2, 'down'));
    expect(second.ok).toBe(true);
    if (!second.ok) return;

    const quality = measureGridQuality(second.grid);
    expect(quality.placedEntries).toBe(2);
    expect(quality.crossings).toBe(1);
    expect(quality.area).toBe(20);
    expect(quality.density).toBeCloseTo(8 / 20);
    expect(quality.directionBalance).toBe(1);
  });

  it('does not claim dominance when candidates trade objectives', () => {
    const compact: GridQuality = {
      placedEntries: 4,
      crossings: 4,
      area: 20,
      density: 0.8,
      directionBalance: 1,
    };
    const complete: GridQuality = {
      placedEntries: 5,
      crossings: 4,
      area: 30,
      density: 0.7,
      directionBalance: 1,
    };

    expect(dominates(compact, complete)).toBe(false);
    expect(dominates(complete, compact)).toBe(false);
  });

  it('recognizes strict Pareto dominance without weights', () => {
    const better: GridQuality = {
      placedEntries: 5,
      crossings: 6,
      area: 24,
      density: 0.75,
      directionBalance: 1,
    };
    const worse: GridQuality = {
      placedEntries: 4,
      crossings: 5,
      area: 30,
      density: 0.7,
      directionBalance: 0.5,
    };

    expect(dominates(better, worse)).toBe(true);
    expect(dominates(worse, better)).toBe(false);
  });

  it('keeps every non-dominated candidate on the Pareto front', () => {
    const candidates = [
      { id: 'compact', quality: { placedEntries: 4, crossings: 5, area: 20, density: 0.8, directionBalance: 1 } },
      { id: 'complete', quality: { placedEntries: 5, crossings: 5, area: 30, density: 0.7, directionBalance: 1 } },
      { id: 'weak', quality: { placedEntries: 3, crossings: 3, area: 35, density: 0.5, directionBalance: 0.5 } },
    ] satisfies readonly { id: string; quality: GridQuality }[];

    expect(paretoFront(candidates, ({ quality }) => quality).map(({ id }) => id)).toEqual([
      'compact',
      'complete',
    ]);
  });
});
