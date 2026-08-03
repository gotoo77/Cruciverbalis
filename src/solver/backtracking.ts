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

export type EntryOrdering = 'fixed' | 'mrv';

export interface SearchMetrics {
  readonly nodesExplored: number;
  readonly placementsTried: number;
  readonly backtracks: number;
  readonly deadEnds: number;
  readonly solutionsFound: number;
  readonly maxDepth: number;
  readonly mrvSelections: number;
  readonly candidateSetsEvaluated: number;
}

export interface BacktrackingOptions {
  readonly maxNodes?: number;
  readonly entryOrdering?: EntryOrdering;
}

export interface BacktrackingResult {
  readonly grid: DomainGrid;
  readonly unplaced: readonly Entry[];
  readonly metrics: SearchMetrics;
  readonly truncated: boolean;
}

interface MutableMetrics {
  nodesExplored: number;
  placementsTried: number;
  backtracks: number;
  deadEnds: number;
  solutionsFound: number;
  maxDepth: number;
  mrvSelections: number;
  candidateSetsEvaluated: number;
}

interface Candidate {
  readonly grid: DomainGrid;
  readonly placement: Placement;
  readonly crossings: number;
  readonly area: number;
}

interface SelectedEntry {
  readonly entry: Entry;
  readonly rest: readonly Entry[];
  readonly candidates: readonly Candidate[];
}

interface SearchBest {
  grid: DomainGrid;
  unplaced: Entry[];
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
    if (grid.cells.has(coordinateKey(coordinateAt(placement, index)))) count += 1;
  }
  return count;
}

function candidatesFor(grid: DomainGrid, entry: Entry): Candidate[] {
  const candidates: Candidate[] = [];
  const seen = new Set<string>();

  for (const existingPlacement of grid.placements) {
    const direction = opposite(existingPlacement.direction);

    for (let existingIndex = 0; existingIndex < existingPlacement.entry.answer.length; existingIndex += 1) {
      const coordinate = coordinateAt(existingPlacement, existingIndex);
      const sharedLetter = existingPlacement.entry.answer.charAt(existingIndex);

      for (let entryIndex = 0; entryIndex < entry.answer.length; entryIndex += 1) {
        if (entry.answer.charAt(entryIndex) !== sharedLetter) continue;

        const start = startForCrossing(coordinate, direction, entryIndex);
        const key = `${start.row},${start.col},${direction}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const placement: Placement = { entry, start, direction };
        const result = placeEntry(grid, placement);
        if (!result.ok) continue;

        candidates.push({
          grid: result.grid,
          placement,
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

function selectNextEntry(
  grid: DomainGrid,
  pending: readonly Entry[],
  ordering: EntryOrdering,
  metrics: MutableMetrics,
): SelectedEntry | undefined {
  if (ordering === 'fixed') {
    const [entry, ...rest] = pending;
    if (!entry) return undefined;
    metrics.candidateSetsEvaluated += 1;
    return { entry, rest, candidates: candidatesFor(grid, entry) };
  }

  let selectedIndex = -1;
  let selectedCandidates: readonly Candidate[] = [];

  for (let index = 0; index < pending.length; index += 1) {
    const entry = pending[index];
    if (!entry) continue;

    const candidates = candidatesFor(grid, entry);
    metrics.candidateSetsEvaluated += 1;

    if (
      selectedIndex < 0 ||
      candidates.length < selectedCandidates.length ||
      (candidates.length === selectedCandidates.length &&
        entry.answer.localeCompare(pending[selectedIndex]?.answer ?? '') < 0)
    ) {
      selectedIndex = index;
      selectedCandidates = candidates;
    }
  }

  if (selectedIndex < 0) return undefined;
  const entry = pending[selectedIndex];
  if (!entry) return undefined;

  metrics.mrvSelections += 1;
  return {
    entry,
    candidates: selectedCandidates,
    rest: pending.filter((_, index) => index !== selectedIndex),
  };
}

function isBetter(grid: DomainGrid, unplaced: readonly Entry[], best: SearchBest): boolean {
  if (unplaced.length !== best.unplaced.length) return unplaced.length < best.unplaced.length;
  if (grid.placements.length !== best.grid.placements.length) {
    return grid.placements.length > best.grid.placements.length;
  }
  return gridArea(grid) < gridArea(best.grid);
}

export function solveBacktracking(
  entries: readonly Entry[],
  options: BacktrackingOptions = {},
): BacktrackingResult {
  const normalized = entries
    .map((entry) => ({ ...entry, answer: normalizeAnswer(entry.answer) }))
    .filter((entry) => entry.answer.length >= 2)
    .sort((left, right) =>
      right.answer.length - left.answer.length || left.answer.localeCompare(right.answer),
    );

  const invalid = entries.filter((entry) => normalizeAnswer(entry.answer).length < 2);
  const metrics: MutableMetrics = {
    nodesExplored: 0,
    placementsTried: 0,
    backtracks: 0,
    deadEnds: 0,
    solutionsFound: 0,
    maxDepth: 0,
    mrvSelections: 0,
    candidateSetsEvaluated: 0,
  };
  const maxNodes = options.maxNodes ?? 100_000;
  const entryOrdering = options.entryOrdering ?? 'mrv';
  let truncated = false;

  if (normalized.length === 0) {
    return {
      grid: createEmptyGrid(),
      unplaced: [...entries],
      metrics,
      truncated,
    };
  }

  const [first, ...remaining] = normalized;
  if (!first) throw new Error('normalized entries unexpectedly empty');

  const initial = placeEntry(createEmptyGrid(), {
    entry: first,
    start: { row: 0, col: 0 },
    direction: 'across',
  });
  if (!initial.ok) {
    return { grid: createEmptyGrid(), unplaced: [...entries], metrics, truncated };
  }

  const best: SearchBest = { grid: initial.grid, unplaced: [...remaining, ...invalid] };

  function explore(grid: DomainGrid, pending: readonly Entry[], skipped: readonly Entry[], depth: number): void {
    if (metrics.nodesExplored >= maxNodes) {
      truncated = true;
      return;
    }

    metrics.nodesExplored += 1;
    metrics.maxDepth = Math.max(metrics.maxDepth, depth);

    if (pending.length === 0) {
      metrics.solutionsFound += 1;
      const unplaced = [...skipped, ...invalid];
      if (isBetter(grid, unplaced, best)) {
        best.grid = grid;
        best.unplaced = unplaced;
      }
      return;
    }

    const selected = selectNextEntry(grid, pending, entryOrdering, metrics);
    if (!selected) return;
    const { entry, rest, candidates } = selected;

    if (candidates.length === 0) metrics.deadEnds += 1;

    for (const candidate of candidates) {
      metrics.placementsTried += 1;
      explore(candidate.grid, rest, skipped, depth + 1);
      metrics.backtracks += 1;
      if (truncated) return;
    }

    // Skipping is an explicit branch: quality before forced completeness.
    explore(grid, rest, [...skipped, entry], depth + 1);
    metrics.backtracks += 1;
  }

  explore(initial.grid, remaining, [], 1);

  return {
    grid: best.grid,
    unplaced: best.unplaced,
    metrics,
    truncated,
  };
}
