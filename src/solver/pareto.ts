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

function placementSignature(grid: DomainGrid): string {
  return grid.placements
    .map(({ entry, start, direction }) => `${entry.answer}@${start.row},${start.col}:${direction}`)
    .sort()
    .join('|');
}

/** Maintains an incremental archive of non-dominated solutions. */
export function addToParetoFront(
  front: readonly ParetoSolution[],
  candidate: ParetoSolution,
): readonly ParetoSolution[] {
  if (front.some((current) => dominates(current.quality, candidate.quality))) {
    return front;
  }

  const signature = placementSignature(candidate.grid);
  if (
    front.some(
      (current) =>
        sameQuality(current.quality, candidate.quality) &&
        placementSignature(current.grid) === signature,
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
