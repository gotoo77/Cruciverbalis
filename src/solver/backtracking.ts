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
import {
  addToParetoFront,
  createParetoSolution,
  type ParetoSolution,
} from './pareto';

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
  readonly candidateAnchorsEvaluated: number;
  readonly crossingIndexesBuilt: number;
  readonly entryLetterIndexesBuilt: number;
  readonly branchesPruned: number;
  readonly paretoCandidates: number;
  readonly paretoAccepted: number;
}

export interface BacktrackingOptions {
  readonly maxNodes?: number;
  readonly entryOrdering?: EntryOrdering;
  readonly branchAndBound?: boolean;
  /** Conserve toutes les solutions terminales non dominées. */
  readonly collectPareto?: boolean;
}

export interface BacktrackingResult {
  readonly grid: DomainGrid;
  readonly unplaced: readonly Entry[];
  readonly metrics: SearchMetrics;
  readonly truncated: boolean;
  readonly paretoFront: readonly ParetoSolution[];
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
  candidateAnchorsEvaluated: number;
  crossingIndexesBuilt: number;
  entryLetterIndexesBuilt: number;
  branchesPruned: number;
  paretoCandidates: number;
  paretoAccepted: number;
}

interface Candidate {
  readonly grid: DomainGrid;
  readonly placement: Placement;
  readonly crossings: number;
  readonly area: number;
}

interface CrossingAnchor {
  readonly coordinate: Coordinate;
  readonly direction: Direction;
}

type CrossingIndex = ReadonlyMap<string, readonly CrossingAnchor[]>;
type EntryLetterIndex = ReadonlyMap<string, readonly number[]>;

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

function startForCrossing(coordinate: Coordinate, direction: Direction, letterIndex: number): Coordinate {
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

function buildCrossingIndex(grid: DomainGrid, metrics: MutableMetrics): CrossingIndex {
  metrics.crossingIndexesBuilt += 1;
  const index = new Map<string, CrossingAnchor[]>();

  for (const placement of grid.placements) {
    const direction = opposite(placement.direction);
    for (let letterIndex = 0; letterIndex < placement.entry.answer.length; letterIndex += 1) {
      const letter = placement.entry.answer.charAt(letterIndex);
      const anchors = index.get(letter) ?? [];
      anchors.push({ coordinate: coordinateAt(placement, letterIndex), direction });
      index.set(letter, anchors);
    }
  }

  return index;
}

function buildEntryLetterIndex(entry: Entry): EntryLetterIndex {
  const index = new Map<string, number[]>();
  for (let letterIndex = 0; letterIndex < entry.answer.length; letterIndex += 1) {
    const letter = entry.answer.charAt(letterIndex);
    const positions = index.get(letter) ?? [];
    positions.push(letterIndex);
    index.set(letter, positions);
  }
  return index;
}

function candidatesFor(
  grid: DomainGrid,
  entry: Entry,
  crossingIndex: CrossingIndex,
  entryIndex: EntryLetterIndex,
  metrics: MutableMetrics,
): Candidate[] {
  const candidates: Candidate[] = [];
  const seen = new Set<string>();

  for (const [letter, positions] of entryIndex) {
    const anchors = crossingIndex.get(letter);
    if (!anchors) continue;

    for (const anchor of anchors) {
      for (const entryIndexPosition of positions) {
        metrics.candidateAnchorsEvaluated += 1;
        const start = startForCrossing(anchor.coordinate, anchor.direction, entryIndexPosition);
        const key = `${start.row},${start.col},${anchor.direction}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const placement: Placement = { entry, start, direction: anchor.direction };
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
  entryIndexes: ReadonlyMap<Entry, EntryLetterIndex>,
  metrics: MutableMetrics,
): SelectedEntry | undefined {
  if (pending.length === 0) return undefined;

  // Un même état de grille sert à évaluer tous les domaines MRV : l'index des
  // ancres est donc construit une seule fois par sélection, et non une fois
  // par mot candidat.
  const crossingIndex = buildCrossingIndex(grid, metrics);

  if (ordering === 'fixed') {
    const [entry, ...rest] = pending;
    if (!entry) return undefined;
    metrics.candidateSetsEvaluated += 1;
    return {
      entry,
      rest,
      candidates: candidatesFor(grid, entry, crossingIndex, entryIndexes.get(entry) ?? buildEntryLetterIndex(entry), metrics),
    };
  }

  let selectedIndex = -1;
  let selectedCandidates: readonly Candidate[] = [];

  for (let index = 0; index < pending.length; index += 1) {
    const entry = pending[index];
    if (!entry) continue;

    const letterIndex = entryIndexes.get(entry) ?? buildEntryLetterIndex(entry);
    const candidates = candidatesFor(grid, entry, crossingIndex, letterIndex, metrics);
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

function cannotBeatBest(skippedCount: number, invalidCount: number, best: SearchBest): boolean {
  const minimumPossibleUnplaced = skippedCount + invalidCount;
  return minimumPossibleUnplaced > best.unplaced.length;
}

export function solveBacktracking(entries: readonly Entry[], options: BacktrackingOptions = {}): BacktrackingResult {
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
    candidateAnchorsEvaluated: 0,
    crossingIndexesBuilt: 0,
    entryLetterIndexesBuilt: 0,
    branchesPruned: 0,
    paretoCandidates: 0,
    paretoAccepted: 0,
  };
  const maxNodes = options.maxNodes ?? 100_000;
  const entryOrdering = options.entryOrdering ?? 'mrv';
  const collectPareto = options.collectPareto ?? false;
  const branchAndBound = (options.branchAndBound ?? true) && !collectPareto;
  let truncated = false;
  let paretoFront: readonly ParetoSolution[] = [];

  const entryIndexes = new Map<Entry, EntryLetterIndex>();
  for (const entry of normalized) {
    entryIndexes.set(entry, buildEntryLetterIndex(entry));
    metrics.entryLetterIndexesBuilt += 1;
  }

  if (normalized.length === 0) {
    const grid = createEmptyGrid();
    if (collectPareto) {
      paretoFront = [createParetoSolution(grid, entries)];
      metrics.paretoCandidates = 1;
      metrics.paretoAccepted = 1;
    }
    return { grid, unplaced: [...entries], metrics, truncated, paretoFront };
  }

  const [first, ...remaining] = normalized;
  if (!first) throw new Error('normalized entries unexpectedly empty');

  const initial = placeEntry(createEmptyGrid(), {
    entry: first,
    start: { row: 0, col: 0 },
    direction: 'across',
  });
  if (!initial.ok) {
    return {
      grid: createEmptyGrid(),
      unplaced: [...entries],
      metrics,
      truncated,
      paretoFront,
    };
  }

  const best: SearchBest = { grid: initial.grid, unplaced: [...remaining, ...invalid] };

  function explore(grid: DomainGrid, pending: readonly Entry[], skipped: readonly Entry[], depth: number): void {
    if (metrics.nodesExplored >= maxNodes) {
      truncated = true;
      return;
    }

    if (branchAndBound && cannotBeatBest(skipped.length, invalid.length, best)) {
      metrics.branchesPruned += 1;
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

      if (collectPareto) {
        metrics.paretoCandidates += 1;
        const next = addToParetoFront(paretoFront, createParetoSolution(grid, unplaced));
        if (next !== paretoFront) metrics.paretoAccepted += 1;
        paretoFront = next;
      }
      return;
    }

    const selected = selectNextEntry(grid, pending, entryOrdering, entryIndexes, metrics);
    if (!selected) return;
    const { entry, rest, candidates } = selected;

    if (candidates.length === 0) metrics.deadEnds += 1;

    for (const candidate of candidates) {
      metrics.placementsTried += 1;
      explore(candidate.grid, rest, skipped, depth + 1);
      metrics.backtracks += 1;
      if (truncated) return;
    }

    explore(grid, rest, [...skipped, entry], depth + 1);
    metrics.backtracks += 1;
  }

  explore(initial.grid, remaining, [], 1);

  return {
    grid: best.grid,
    unplaced: best.unplaced,
    metrics,
    truncated,
    paretoFront,
  };
}

export function solveParetoBacktracking(
  entries: readonly Entry[],
  options: Omit<BacktrackingOptions, 'collectPareto'> = {},
): BacktrackingResult {
  return solveBacktracking(entries, { ...options, collectPareto: true });
}
