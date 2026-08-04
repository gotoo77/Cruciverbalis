import type { DomainGrid, Entry } from '../core/domain';
import { dominates, measureGridQuality, type GridQuality } from '../quality/grid-quality';

export interface ParetoSolution {
  readonly grid: DomainGrid;
  readonly unplaced: readonly Entry[];
  readonly quality: GridQuality;
}

function sameQuality(left: GridQuality, right: GridQuality): boolean {
  return (
    left.placedEntries === right.placedEntries &&
    left.crossings === right.crossings &&
    left.area === right.area &&
    left.density === right.density &&
    left.directionBalance === right.directionBalance
  );
}

/**
 * Canonical placement signature invariant under translation.
 *
 * Search coordinates are implementation details: moving an otherwise identical
 * crossword three rows down does not create a meaningfully new solution. We
 * therefore anchor every grid at (0, 0) before comparing its placements.
 *
 * Rotation/reflection are deliberately NOT normalized here. They are a
 * separate equivalence question because across/down orientation can matter to
 * consumers and to future editorial criteria.
 */
export function translationInvariantPlacementSignature(grid: DomainGrid): string {
  if (grid.placements.length === 0) return '';

  const minRow = Math.min(...grid.placements.map(({ start }) => start.row));
  const minCol = Math.min(...grid.placements.map(({ start }) => start.col));

  return grid.placements
    .map(
      ({ entry, start, direction }) =>
        `${entry.answer}@${start.row - minRow},${start.col - minCol}:${direction}`,
    )
    .sort()
    .join('|');
}

/** Maintains an incremental archive of non-dominated, non-redundant solutions. */
export function addToParetoFront(
  front: readonly ParetoSolution[],
  candidate: ParetoSolution,
): readonly ParetoSolution[] {
  if (front.some((current) => dominates(current.quality, candidate.quality))) {
    return front;
  }

  const signature = translationInvariantPlacementSignature(candidate.grid);
  if (
    front.some(
      (current) =>
        sameQuality(current.quality, candidate.quality) &&
        translationInvariantPlacementSignature(current.grid) === signature,
    )
  ) {
    return front;
  }

  return [
    ...front.filter((current) => !dominates(candidate.quality, current.quality)),
    candidate,
  ];
}

export function createParetoSolution(
  grid: DomainGrid,
  unplaced: readonly Entry[],
): ParetoSolution {
  return {
    grid,
    unplaced: [...unplaced],
    quality: measureGridQuality(grid),
  };
}
