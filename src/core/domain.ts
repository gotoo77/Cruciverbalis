export type Direction = 'across' | 'down';

export interface Coordinate {
  readonly row: number;
  readonly col: number;
}

export interface Entry {
  readonly answer: string;
  readonly clue?: string;
  readonly theme?: string;
  readonly difficulty?: number;
}

export interface Placement {
  readonly entry: Entry;
  readonly start: Coordinate;
  readonly direction: Direction;
}

export interface CellOccupancy {
  readonly letter: string;
  readonly directions: ReadonlySet<Direction>;
}

export type PlacementFailureCode =
  | 'invalid-answer'
  | 'letter-conflict'
  | 'parallel-overlap'
  | 'adjacent-word'
  | 'touching-end';

export interface PlacementFailure {
  readonly ok: false;
  readonly code: PlacementFailureCode;
  readonly message: string;
  readonly coordinate?: Coordinate;
}

export interface PlacementSuccess {
  readonly ok: true;
  readonly grid: DomainGrid;
}

export type PlacementResult = PlacementSuccess | PlacementFailure;

export interface DomainGrid {
  readonly cells: ReadonlyMap<string, CellOccupancy>;
  readonly placements: readonly Placement[];
}

export function coordinateKey(coordinate: Coordinate): string {
  return `${coordinate.row},${coordinate.col}`;
}

export function coordinateAt(
  placement: Placement,
  index: number,
): Coordinate {
  return placement.direction === 'across'
    ? { row: placement.start.row, col: placement.start.col + index }
    : { row: placement.start.row + index, col: placement.start.col };
}

export function createEmptyGrid(): DomainGrid {
  return {
    cells: new Map(),
    placements: [],
  };
}
