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
import { addToParetoFront, createParetoSolution, type ParetoSolution } from './pareto';

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
  readonly candidateCacheHits: number;
  readonly candidateCacheMisses: number;
  readonly candidateCacheEvictions: number;
  readonly forwardChecks: number;
  readonly entriesForcedUnplaced: number;
  readonly forwardCheckPrunes: number;
  readonly branchesPruned: number;
  readonly paretoCandidates: number;
  readonly paretoAccepted: number;
}

export interface BacktrackingOptions {
  readonly maxNodes?: number;
  readonly entryOrdering?: EntryOrdering;
  readonly branchAndBound?: boolean;
  readonly candidateCache?: boolean;
  readonly maxCandidateCacheEntries?: number;
  readonly forwardChecking?: boolean;
  readonly collectPareto?: boolean;
  /** Internal accounting offset used by the historical facade for its pre-seeded first entry. */
  readonly initialEntryLetterIndexesBuilt?: number;
}

export interface BacktrackingResult {
  readonly grid: DomainGrid;
  readonly unplaced: readonly Entry[];
  readonly metrics: SearchMetrics;
  readonly truncated: boolean;
  readonly paretoFront: readonly ParetoSolution[];
}

interface MutableMetrics extends Record<keyof SearchMetrics, number> {}
interface Candidate { readonly grid: DomainGrid; readonly placement: Placement; readonly crossings: number; readonly area: number }
interface CrossingAnchor { readonly coordinate: Coordinate; readonly direction: Direction }
type CrossingIndex = ReadonlyMap<string, readonly CrossingAnchor[]>;
type EntryLetterIndex = ReadonlyMap<string, readonly number[]>;
interface CandidateCache { readonly values: Map<string, readonly Candidate[]>; readonly maxEntries: number }
interface SelectedEntry { readonly entry: Entry; readonly rest: readonly Entry[]; readonly candidates: readonly Candidate[] }
interface SearchBest { grid: DomainGrid; unplaced: Entry[] }

function emptyMetrics(): MutableMetrics {
  return {
    nodesExplored: 0, placementsTried: 0, backtracks: 0, deadEnds: 0, solutionsFound: 0,
    maxDepth: 0, mrvSelections: 0, candidateSetsEvaluated: 0, candidateAnchorsEvaluated: 0,
    crossingIndexesBuilt: 0, entryLetterIndexesBuilt: 0, candidateCacheHits: 0,
    candidateCacheMisses: 0, candidateCacheEvictions: 0, forwardChecks: 0,
    entriesForcedUnplaced: 0, forwardCheckPrunes: 0, branchesPruned: 0,
    paretoCandidates: 0, paretoAccepted: 0,
  };
}

function opposite(direction: Direction): Direction { return direction === 'across' ? 'down' : 'across'; }
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
  return (Math.max(...rows) - Math.min(...rows) + 1) * (Math.max(...cols) - Math.min(...cols) + 1);
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
function candidatesFor(grid: DomainGrid, entry: Entry, crossingIndex: CrossingIndex, entryIndex: EntryLetterIndex, metrics: MutableMetrics): Candidate[] {
  const candidates: Candidate[] = [];
  const seen = new Set<string>();
  for (const [letter, positions] of entryIndex) {
    const anchors = crossingIndex.get(letter);
    if (!anchors) continue;
    for (const anchor of anchors) for (const entryIndexPosition of positions) {
      metrics.candidateAnchorsEvaluated += 1;
      const start = startForCrossing(anchor.coordinate, anchor.direction, entryIndexPosition);
      const key = `${start.row},${start.col},${anchor.direction}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const placement: Placement = { entry, start, direction: anchor.direction };
      const result = placeEntry(grid, placement);
      if (!result.ok) continue;
      candidates.push({ grid: result.grid, placement, crossings: crossingCount(grid, placement), area: gridArea(result.grid) });
    }
  }
  return candidates.sort((left, right) =>
    right.crossings - left.crossings || left.area - right.area ||
    left.placement.start.row - right.placement.start.row || left.placement.start.col - right.placement.start.col ||
    left.placement.direction.localeCompare(right.placement.direction));
}
function gridStateKey(grid: DomainGrid): string {
  return grid.placements.map(({ entry, start, direction }) => `${entry.answer}@${start.row},${start.col},${direction}`).sort().join('|');
}
function cachedCandidatesFor(grid: DomainGrid, entry: Entry, entryId: number, crossingIndex: CrossingIndex, entryIndex: EntryLetterIndex, cache: CandidateCache | undefined, metrics: MutableMetrics): readonly Candidate[] {
  if (!cache) return candidatesFor(grid, entry, crossingIndex, entryIndex, metrics);
  const key = `${entryId}::${gridStateKey(grid)}`;
  const cached = cache.values.get(key);
  if (cached) { metrics.candidateCacheHits += 1; return cached; }
  metrics.candidateCacheMisses += 1;
  const candidates = candidatesFor(grid, entry, crossingIndex, entryIndex, metrics);
  if (cache.values.size >= cache.maxEntries) {
    const oldest = cache.values.keys().next().value as string | undefined;
    if (oldest !== undefined) { cache.values.delete(oldest); metrics.candidateCacheEvictions += 1; }
  }
  cache.values.set(key, candidates);
  return candidates;
}
function partitionByFutureReachability(pending: readonly Entry[], crossingIndex: CrossingIndex, entryIndexes: ReadonlyMap<Entry, EntryLetterIndex>) {
  if (pending.length === 0) return { reachable: [] as Entry[], unreachable: [] as Entry[] };
  const availableLetters = new Set(crossingIndex.keys());
  const remaining = new Set(pending);
  const reachable: Entry[] = [];
  let progressed = true;
  while (progressed) {
    progressed = false;
    for (const entry of [...remaining]) {
      const letterIndex = entryIndexes.get(entry) ?? buildEntryLetterIndex(entry);
      if (![...letterIndex.keys()].some((letter) => availableLetters.has(letter))) continue;
      reachable.push(entry); remaining.delete(entry);
      for (const letter of letterIndex.keys()) availableLetters.add(letter);
      progressed = true;
    }
  }
  return { reachable, unreachable: pending.filter((entry) => remaining.has(entry)) };
}
function selectNextEntry(grid: DomainGrid, pending: readonly Entry[], ordering: EntryOrdering, crossingIndex: CrossingIndex, entryIndexes: ReadonlyMap<Entry, EntryLetterIndex>, entryIds: ReadonlyMap<Entry, number>, candidateCache: CandidateCache | undefined, metrics: MutableMetrics): SelectedEntry | undefined {
  if (pending.length === 0) return undefined;
  if (ordering === 'fixed') {
    const [entry, ...rest] = pending;
    if (!entry) return undefined;
    metrics.candidateSetsEvaluated += 1;
    return { entry, rest, candidates: cachedCandidatesFor(grid, entry, entryIds.get(entry) ?? -1, crossingIndex, entryIndexes.get(entry) ?? buildEntryLetterIndex(entry), candidateCache, metrics) };
  }
  let selectedIndex = -1;
  let selectedCandidates: readonly Candidate[] = [];
  let zeroDomainIndex = -1;
  for (let index = 0; index < pending.length; index += 1) {
    const entry = pending[index]; if (!entry) continue;
    const candidates = cachedCandidatesFor(grid, entry, entryIds.get(entry) ?? -1, crossingIndex, entryIndexes.get(entry) ?? buildEntryLetterIndex(entry), candidateCache, metrics);
    metrics.candidateSetsEvaluated += 1;
    if (candidates.length === 0) {
      if (zeroDomainIndex < 0 || entry.answer.localeCompare(pending[zeroDomainIndex]?.answer ?? '') < 0) zeroDomainIndex = index;
      continue;
    }
    if (selectedIndex < 0 || candidates.length < selectedCandidates.length || (candidates.length === selectedCandidates.length && entry.answer.localeCompare(pending[selectedIndex]?.answer ?? '') < 0)) {
      selectedIndex = index; selectedCandidates = candidates;
    }
  }
  if (selectedIndex < 0) { selectedIndex = zeroDomainIndex; selectedCandidates = []; }
  if (selectedIndex < 0) return undefined;
  const entry = pending[selectedIndex]; if (!entry) return undefined;
  metrics.mrvSelections += 1;
  return { entry, candidates: selectedCandidates, rest: pending.filter((_, index) => index !== selectedIndex) };
}
function isBetter(grid: DomainGrid, unplaced: readonly Entry[], best: SearchBest): boolean {
  if (unplaced.length !== best.unplaced.length) return unplaced.length < best.unplaced.length;
  if (grid.placements.length !== best.grid.placements.length) return grid.placements.length > best.grid.placements.length;
  return gridArea(grid) < gridArea(best.grid);
}
function cannotBeatBest(skippedCount: number, invalidCount: number, best: SearchBest): boolean {
  return skippedCount + invalidCount > best.unplaced.length;
}

/** Moteur canonique : recherche depuis un état de grille déjà admissible. */
export function solveBacktrackingFromState(initialGrid: DomainGrid, entries: readonly Entry[], options: BacktrackingOptions = {}): BacktrackingResult {
  const normalized = entries.map((entry) => ({ ...entry, answer: normalizeAnswer(entry.answer) }))
    .filter((entry) => entry.answer.length >= 2)
    .sort((left, right) => right.answer.length - left.answer.length || left.answer.localeCompare(right.answer));
  const invalid = entries.filter((entry) => normalizeAnswer(entry.answer).length < 2);
  const metrics = emptyMetrics();
  metrics.entryLetterIndexesBuilt = options.initialEntryLetterIndexesBuilt ?? 0;
  const maxNodes = options.maxNodes ?? 100_000;
  const entryOrdering = options.entryOrdering ?? 'mrv';
  const collectPareto = options.collectPareto ?? false;
  const branchAndBound = (options.branchAndBound ?? true) && !collectPareto;
  const forwardChecking = options.forwardChecking ?? true;
  const candidateCache: CandidateCache | undefined = (options.candidateCache ?? true)
    ? { values: new Map(), maxEntries: Math.max(1, options.maxCandidateCacheEntries ?? 10_000) }
    : undefined;
  let truncated = false;
  let paretoFront: readonly ParetoSolution[] = [];
  const entryIndexes = new Map<Entry, EntryLetterIndex>();
  const entryIds = new Map<Entry, number>();
  normalized.forEach((entry, index) => { entryIndexes.set(entry, buildEntryLetterIndex(entry)); entryIds.set(entry, index); metrics.entryLetterIndexesBuilt += 1; });
  const best: SearchBest = { grid: initialGrid, unplaced: [...normalized, ...invalid] };

  function recordTerminal(grid: DomainGrid, skipped: readonly Entry[]): void {
    metrics.solutionsFound += 1;
    const unplaced = [...skipped, ...invalid];
    if (isBetter(grid, unplaced, best)) { best.grid = grid; best.unplaced = unplaced; }
    if (collectPareto) {
      metrics.paretoCandidates += 1;
      const next = addToParetoFront(paretoFront, createParetoSolution(grid, unplaced));
      if (next !== paretoFront) metrics.paretoAccepted += 1;
      paretoFront = next;
    }
  }
  function explore(grid: DomainGrid, pending: readonly Entry[], skipped: readonly Entry[], depth: number): void {
    if (metrics.nodesExplored >= maxNodes) { truncated = true; return; }
    if (branchAndBound && cannotBeatBest(skipped.length, invalid.length, best)) { metrics.branchesPruned += 1; return; }
    metrics.nodesExplored += 1; metrics.maxDepth = Math.max(metrics.maxDepth, depth);
    if (pending.length === 0) { recordTerminal(grid, skipped); return; }
    const crossingIndex = buildCrossingIndex(grid, metrics);
    let effectivePending = pending; let effectiveSkipped = skipped;
    if (forwardChecking) {
      metrics.forwardChecks += 1;
      const partition = partitionByFutureReachability(pending, crossingIndex, entryIndexes);
      if (partition.unreachable.length > 0) {
        metrics.entriesForcedUnplaced += partition.unreachable.length;
        effectivePending = partition.reachable; effectiveSkipped = [...skipped, ...partition.unreachable];
        if (branchAndBound && cannotBeatBest(effectiveSkipped.length, invalid.length, best)) {
          metrics.branchesPruned += 1; metrics.forwardCheckPrunes += 1; return;
        }
      }
    }
    if (effectivePending.length === 0) { recordTerminal(grid, effectiveSkipped); return; }
    const selected = selectNextEntry(grid, effectivePending, entryOrdering, crossingIndex, entryIndexes, entryIds, candidateCache, metrics);
    if (!selected) return;
    const { entry, rest, candidates } = selected;
    if (candidates.length === 0) metrics.deadEnds += 1;
    for (const candidate of candidates) {
      metrics.placementsTried += 1;
      explore(candidate.grid, rest, effectiveSkipped, depth + 1);
      metrics.backtracks += 1;
      if (truncated) return;
    }
    explore(grid, rest, [...effectiveSkipped, entry], depth + 1);
    metrics.backtracks += 1;
  }

  if (normalized.length === 0) {
    recordTerminal(initialGrid, []);
  } else {
    explore(initialGrid, normalized, [], initialGrid.placements.length);
  }
  return { grid: best.grid, unplaced: best.unplaced, metrics, truncated, paretoFront };
}

/** Façade historique : conserve exactement l'amorçage déterministe au premier mot en (0,0) horizontal. */
export function solveBacktracking(entries: readonly Entry[], options: BacktrackingOptions = {}): BacktrackingResult {
  const normalized = entries.map((entry) => ({ ...entry, answer: normalizeAnswer(entry.answer) }))
    .filter((entry) => entry.answer.length >= 2)
    .sort((left, right) => right.answer.length - left.answer.length || left.answer.localeCompare(right.answer));
  if (normalized.length === 0) return solveBacktrackingFromState(createEmptyGrid(), entries, options);
  const [first, ...remaining] = normalized;
  if (!first) throw new Error('normalized entries unexpectedly empty');
  const initial = placeEntry(createEmptyGrid(), { entry: first, start: { row: 0, col: 0 }, direction: 'across' });
  if (!initial.ok) return solveBacktrackingFromState(createEmptyGrid(), entries, options);
  const invalid = entries.filter((entry) => normalizeAnswer(entry.answer).length < 2);
  return solveBacktrackingFromState(initial.grid, [...remaining, ...invalid], {
    ...options,
    initialEntryLetterIndexesBuilt: (options.initialEntryLetterIndexesBuilt ?? 0) + 1,
  });
}

export function solveParetoBacktracking(entries: readonly Entry[], options: Omit<BacktrackingOptions, 'collectPareto'> = {}): BacktrackingResult {
  return solveBacktracking(entries, { ...options, collectPareto: true });
}

export function solveParetoBacktrackingFromState(initialGrid: DomainGrid, entries: readonly Entry[], options: Omit<BacktrackingOptions, 'collectPareto'> = {}): BacktrackingResult {
  return solveBacktrackingFromState(initialGrid, entries, { ...options, collectPareto: true });
}
