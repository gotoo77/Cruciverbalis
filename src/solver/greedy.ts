import {
  coordinateAt,
  coordinateKey,
  type Coordinate,
  type Direction,
  type DomainGrid,
  type Entry,
  type Placement,
} from '../core/domain';
import { createEmptyGrid, placeEntry } from '../core/grid';
import { normalizeAnswer } from '../core/normalize';

export interface SolverResult {
  readonly grid: DomainGrid;
  readonly unplaced: readonly Entry[];
}

interface Candidate {
  readonly placement: Placement;
  readonly grid: DomainGrid;
  readonly crossings: number;
  readonly area: number;
}

function opposite(direction: Direction): Direction {
  return direction === 'across' ? 'down' : 'across';
}

function startForCrossing(
  coordinate: Coordinate,
  direction: Direction,
  letterIndex: number,
): Coordinate {
  return direction === 'across'
    ? { row: coordinate.row, col: coordinate.col - letterIndex }
    : { row: coordinate.row - letterIndex, col: coordinate.col };
}

function gridArea(grid: DomainGrid): number {
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

function crossingCount(grid: DomainGrid, placement: Placement): number {
  let count = 0;
  for (let index = 0; index < placement.entry.answer.length; index += 1) {
    const existing = grid.cells.get(coordinateKey(coordinateAt(placement, index)));
    if (existing) count += 1;
  }
  return count;
}

function candidatesFor(grid: DomainGrid, entry: Entry): Candidate[] {
  const answer = normalizeAnswer(entry.answer);
  const normalizedEntry = { ...entry, answer };
  const candidates: Candidate[] = [];
  const seen = new Set<string>();

  for (const existingPlacement of grid.placements) {
    const direction = opposite(existingPlacement.direction);

    for (let existingIndex = 0; existingIndex < existingPlacement.entry.answer.length; existingIndex += 1) {
      const coordinate = coordinateAt(existingPlacement, existingIndex);
      const sharedLetter = existingPlacement.entry.answer.charAt(existingIndex);

      for (let entryIndex = 0; entryIndex < answer.length; entryIndex += 1) {
        if (answer.charAt(entryIndex) !== sharedLetter) continue;

        const start = startForCrossing(coordinate, direction, entryIndex);
        const key = `${start.row},${start.col},${direction}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const placement: Placement = { entry: normalizedEntry, start, direction };
        const result = placeEntry(grid, placement);
        if (!result.ok) continue;

        candidates.push({
          placement,
          grid: result.grid,
          crossings: crossingCount(grid, placement),
          area: gridArea(result.grid),
        });
      }
    }
  }

  return candidates.sort((left, right) =>
    right.crossings - left.crossings ||
    left.area - right.area ||
    left.placement.start.row - right.placement.start.row ||
    left.placement.start.col - right.placement.start.col ||
    left.placement.direction.localeCompare(right.placement.direction),
  );
}

export function solveGreedy(entries: readonly Entry[]): SolverResult {
  const normalized = entries
    .map((entry) => ({ ...entry, answer: normalizeAnswer(entry.answer) }))
    .filter((entry) => entry.answer.length >= 2)
    .sort((left, right) =>
      right.answer.length - left.answer.length || left.answer.localeCompare(right.answer),
    );

  if (normalized.length === 0) {
    return { grid: createEmptyGrid(), unplaced: [...entries] };
  }

  const [first, ...remaining] = normalized;
  if (!first) return { grid: createEmptyGrid(), unplaced: [...entries] };

  const initial = placeEntry(createEmptyGrid(), {
    entry: first,
    start: { row: 0, col: 0 },
    direction: 'across',
  });

  if (!initial.ok) {
    return { grid: createEmptyGrid(), unplaced: normalized };
  }

  let grid = initial.grid;
  const unplaced: Entry[] = [];

  for (const entry of remaining) {
    const candidate = candidatesFor(grid, entry)[0];
    if (!candidate) {
      unplaced.push(entry);
      continue;
    }
    grid = candidate.grid;
  }

  return { grid, unplaced };
}
