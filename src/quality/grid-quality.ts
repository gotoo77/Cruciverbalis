import type { DomainGrid } from '../core/domain';

export interface GridQuality {
  /** Number of entries actually placed in the grid. Higher is better. */
  readonly placedEntries: number;
  /** Number of occupied cells shared by an across and a down entry. Higher is better. */
  readonly crossings: number;
  /** Bounding-box area containing the grid. Lower is better at equal completeness. */
  readonly area: number;
  /** Occupied cells divided by bounding-box area, in [0, 1]. Higher is better. */
  readonly density: number;
  /** Balance between across and down entries, in [0, 1]. Higher is better. */
  readonly directionBalance: number;
}

function boundingArea(grid: DomainGrid): number {
  if (grid.cells.size === 0) return 0;

  const coordinates = [...grid.cells.keys()].map((key) => {
    const [row = 0, col = 0] = key.split(',').map(Number);
    return { row, col };
  });
  const rows = coordinates.map(({ row }) => row);
  const cols = coordinates.map(({ col }) => col);

  return (Math.max(...rows) - Math.min(...rows) + 1) *
    (Math.max(...cols) - Math.min(...cols) + 1);
}

export function measureGridQuality(grid: DomainGrid): GridQuality {
  const area = boundingArea(grid);
  const crossings = [...grid.cells.values()].filter((cell) => cell.directions.size > 1).length;
  const across = grid.placements.filter((placement) => placement.direction === 'across').length;
  const down = grid.placements.length - across;
  const directionBalance =
    grid.placements.length === 0
      ? 1
      : 1 - Math.abs(across - down) / grid.placements.length;

  return {
    placedEntries: grid.placements.length,
    crossings,
    area,
    density: area === 0 ? 0 : grid.cells.size / area,
    directionBalance,
  };
}

/**
 * Returns true when `left` is at least as good as `right` on every objective
 * and strictly better on at least one. No arbitrary weights are introduced.
 */
export function dominates(left: GridQuality, right: GridQuality): boolean {
  const noWorse =
    left.placedEntries >= right.placedEntries &&
    left.crossings >= right.crossings &&
    left.area <= right.area &&
    left.density >= right.density &&
    left.directionBalance >= right.directionBalance;

  if (!noWorse) return false;

  return (
    left.placedEntries > right.placedEntries ||
    left.crossings > right.crossings ||
    left.area < right.area ||
    left.density > right.density ||
    left.directionBalance > right.directionBalance
  );
}

export function paretoFront<T>(
  values: readonly T[],
  qualityOf: (value: T) => GridQuality,
): readonly T[] {
  return values.filter((candidate, candidateIndex) =>
    !values.some(
      (other, otherIndex) =>
        otherIndex !== candidateIndex && dominates(qualityOf(other), qualityOf(candidate)),
    ),
  );
}
