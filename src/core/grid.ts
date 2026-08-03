import {
  coordinateAt,
  coordinateKey,
  createEmptyGrid,
  type CellOccupancy,
  type Coordinate,
  type Direction,
  type DomainGrid,
  type Placement,
  type PlacementFailure,
  type PlacementResult,
} from './domain';
import { normalizeAnswer } from './normalize';

function offset(coordinate: Coordinate, direction: Direction, delta: number): Coordinate {
  return direction === 'across'
    ? { row: coordinate.row, col: coordinate.col + delta }
    : { row: coordinate.row + delta, col: coordinate.col };
}

function perpendicularNeighbours(coordinate: Coordinate, direction: Direction): Coordinate[] {
  return direction === 'across'
    ? [
        { row: coordinate.row - 1, col: coordinate.col },
        { row: coordinate.row + 1, col: coordinate.col },
      ]
    : [
        { row: coordinate.row, col: coordinate.col - 1 },
        { row: coordinate.row, col: coordinate.col + 1 },
      ];
}

function failure(
  code: PlacementFailure['code'],
  message: string,
  coordinate?: Coordinate,
): PlacementFailure {
  return { ok: false, code, message, coordinate };
}

export function placeEntry(grid: DomainGrid, placement: Placement): PlacementResult {
  const answer = normalizeAnswer(placement.entry.answer);
  if (answer.length < 2) {
    return failure('invalid-answer', 'An answer must contain at least two letters.');
  }

  const normalized: Placement = {
    ...placement,
    entry: { ...placement.entry, answer },
  };

  // Validate occupied cells first so the most specific structural failure wins.
  // For example, an overlapping parallel entry must not be reported merely as
  // touching the previous entry at one of its ends.
  for (let index = 0; index < answer.length; index += 1) {
    const coordinate = coordinateAt(normalized, index);
    const existing = grid.cells.get(coordinateKey(coordinate));
    const letter = answer.charAt(index);

    if (existing && existing.letter !== letter) {
      return failure('letter-conflict', 'Crossing letters must be identical.', coordinate);
    }

    if (existing?.directions.has(normalized.direction)) {
      return failure('parallel-overlap', 'Parallel entries cannot share cells.', coordinate);
    }

    if (!existing) {
      for (const neighbour of perpendicularNeighbours(coordinate, normalized.direction)) {
        if (grid.cells.has(coordinateKey(neighbour))) {
          return failure('adjacent-word', 'Entries cannot run side by side without crossing.', coordinate);
        }
      }
    }
  }

  const before = offset(normalized.start, normalized.direction, -1);
  const after = offset(normalized.start, normalized.direction, answer.length);
  if (grid.cells.has(coordinateKey(before)) || grid.cells.has(coordinateKey(after))) {
    return failure('touching-end', 'An entry cannot touch another entry at either end.');
  }

  const cells = new Map(grid.cells);
  for (let index = 0; index < answer.length; index += 1) {
    const coordinate = coordinateAt(normalized, index);
    const key = coordinateKey(coordinate);
    const existing = cells.get(key);
    const directions = new Set(existing?.directions ?? []);
    directions.add(normalized.direction);
    const cell: CellOccupancy = { letter: answer.charAt(index), directions };
    cells.set(key, cell);
  }

  return {
    ok: true,
    grid: {
      cells,
      placements: [...grid.placements, normalized],
    },
  };
}

export { createEmptyGrid };
