import { describe, expect, it } from 'vitest';
import { createEmptyGrid, placeEntry } from '../src/core/grid';
import type { Direction, DomainGrid, Entry } from '../src/core/domain';
import {
  analyzeParetoMorphology,
  gridMorphologySignature,
  measureGridMorphology,
  type GridQuality,
} from '../src/api';

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

const sharedQuality: GridQuality = {
  placedEntries: 1,
  crossings: 0,
  area: 4,
  density: 1,
  directionBalance: 0,
};

describe('grid morphology', () => {
  it('measures bounding shape and crossing-graph structure', () => {
    const chat = { answer: 'CHAT' };
    const tache = { answer: 'TACHE' };
    const grid = gridWith([
      { entry: chat, row: 0, col: 0, direction: 'across' },
      { entry: tache, row: 0, col: 3, direction: 'down' },
    ]);

    expect(measureGridMorphology(grid)).toMatchObject({
      width: 4,
      height: 5,
      aspectRatio: 1.25,
      leafEntries: 2,
      maxEntryDegree: 1,
      graphDiameter: 1,
    });
  });

  it('is invariant under translation', () => {
    const chat = { answer: 'CHAT' };
    const first = gridWith([{ entry: chat, row: 0, col: 0, direction: 'across' }]);
    const translated = gridWith([{ entry: chat, row: 12, col: -7, direction: 'across' }]);

    expect(gridMorphologySignature(measureGridMorphology(translated))).toBe(
      gridMorphologySignature(measureGridMorphology(first)),
    );
  });

  it('reveals morphology differences hidden inside one quality profile', () => {
    const chat = { answer: 'CHAT' };
    const horizontal = gridWith([{ entry: chat, row: 0, col: 0, direction: 'across' }]);
    const vertical = gridWith([{ entry: chat, row: 0, col: 0, direction: 'down' }]);

    const analysis = analyzeParetoMorphology([
      { id: 'horizontal', grid: horizontal, quality: sharedQuality },
      { id: 'vertical', grid: vertical, quality: sharedQuality },
    ]);

    expect(analysis.solutionCount).toBe(2);
    expect(analysis.morphologyProfileCount).toBe(2);
    expect(analysis.qualityProfilesSplitByMorphology).toBe(1);
    expect(analysis.repeatedMorphologyProfileCount).toBe(0);
  });

  it('handles an empty front', () => {
    expect(analyzeParetoMorphology([])).toMatchObject({
      solutionCount: 0,
      morphologyProfileCount: 0,
      repeatedMorphologyProfileCount: 0,
      largestMorphologyFamilySize: 0,
      qualityProfilesSplitByMorphology: 0,
    });
  });
});
