import { coordinateAt, coordinateKey, type Direction, type DomainGrid, type Entry, type Placement } from '../core/domain';
import { placeEntry } from '../core/grid';
import { normalizeAnswer } from '../core/normalize';
import { addToParetoFront, createParetoSolution, type ParetoSolution } from './pareto';
import type { BacktrackingOptions, BacktrackingResult, SearchMetrics } from './backtracking';

interface Candidate { readonly grid: DomainGrid; readonly placement: Placement; readonly crossings: number; readonly area: number }

function emptyMetrics(): SearchMetrics {
  return {
    nodesExplored: 0, placementsTried: 0, backtracks: 0, deadEnds: 0, solutionsFound: 0,
    maxDepth: 0, mrvSelections: 0, candidateSetsEvaluated: 0, candidateAnchorsEvaluated: 0,
    crossingIndexesBuilt: 0, entryLetterIndexesBuilt: 0, candidateCacheHits: 0,
    candidateCacheMisses: 0, candidateCacheEvictions: 0, forwardChecks: 0,
    entriesForcedUnplaced: 0, forwardCheckPrunes: 0, branchesPruned: 0,
    paretoCandidates: 0, paretoAccepted: 0,
  };
}

function area(grid: DomainGrid): number {
  if (grid.cells.size === 0) return 0;
  const coordinates = [...grid.cells.keys()].map((key) => key.split(',').map(Number));
  const rows = coordinates.map(([row = 0]) => row);
  const cols = coordinates.map(([, col = 0]) => col);
  return (Math.max(...rows) - Math.min(...rows) + 1) * (Math.max(...cols) - Math.min(...cols) + 1);
}

function opposite(direction: Direction): Direction { return direction === 'across' ? 'down' : 'across'; }

function candidatesFor(grid: DomainGrid, entry: Entry): Candidate[] {
  const answer = normalizeAnswer(entry.answer);
  const seen = new Set<string>();
  const candidates: Candidate[] = [];
  for (const existing of grid.placements) {
    for (let existingIndex = 0; existingIndex < existing.entry.answer.length; existingIndex += 1) {
      const anchor = coordinateAt(existing, existingIndex);
      const letter = existing.entry.answer.charAt(existingIndex);
      for (let entryIndex = 0; entryIndex < answer.length; entryIndex += 1) {
        if (answer.charAt(entryIndex) !== letter) continue;
        const direction = opposite(existing.direction);
        const start = direction === 'across'
          ? { row: anchor.row, col: anchor.col - entryIndex }
          : { row: anchor.row - entryIndex, col: anchor.col };
        const key = `${start.row},${start.col},${direction}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const placement: Placement = { entry: { ...entry, answer }, start, direction };
        const placed = placeEntry(grid, placement);
        if (!placed.ok) continue;
        let crossings = 0;
        for (let index = 0; index < answer.length; index += 1) {
          if (grid.cells.has(coordinateKey(coordinateAt(placement, index)))) crossings += 1;
        }
        candidates.push({ grid: placed.grid, placement, crossings, area: area(placed.grid) });
      }
    }
  }
  return candidates.sort((left, right) =>
    right.crossings - left.crossings || left.area - right.area ||
    left.placement.start.row - right.placement.start.row ||
    left.placement.start.col - right.placement.start.col ||
    left.placement.direction.localeCompare(right.placement.direction));
}

/** Recherche contrainte démarrant d'une grille éditoriale déjà validée. */
export function solveSeededBacktracking(
  initialGrid: DomainGrid,
  entries: readonly Entry[],
  options: BacktrackingOptions = {},
  collectPareto = false,
): BacktrackingResult {
  const pending = entries
    .map((entry) => ({ ...entry, answer: normalizeAnswer(entry.answer) }))
    .filter((entry) => entry.answer.length >= 2)
    .sort((a, b) => b.answer.length - a.answer.length || a.answer.localeCompare(b.answer));
  const invalid = entries.filter((entry) => normalizeAnswer(entry.answer).length < 2);
  const metrics = emptyMetrics() as { -readonly [K in keyof SearchMetrics]: SearchMetrics[K] };
  const maxNodes = options.maxNodes ?? 100_000;
  let truncated = false;
  let paretoFront: readonly ParetoSolution[] = [];
  let bestGrid = initialGrid;
  let bestUnplaced: readonly Entry[] = [...pending, ...invalid];

  const better = (grid: DomainGrid, unplaced: readonly Entry[]) =>
    unplaced.length < bestUnplaced.length ||
    (unplaced.length === bestUnplaced.length && (grid.placements.length > bestGrid.placements.length ||
      (grid.placements.length === bestGrid.placements.length && area(grid) < area(bestGrid))));

  function terminal(grid: DomainGrid, skipped: readonly Entry[]): void {
    metrics.solutionsFound += 1;
    const unplaced = [...skipped, ...invalid];
    if (better(grid, unplaced)) { bestGrid = grid; bestUnplaced = unplaced; }
    if (collectPareto) {
      metrics.paretoCandidates += 1;
      const next = addToParetoFront(paretoFront, createParetoSolution(grid, unplaced));
      if (next !== paretoFront) metrics.paretoAccepted += 1;
      paretoFront = next;
    }
  }

  function explore(grid: DomainGrid, rest: readonly Entry[], skipped: readonly Entry[], depth: number): void {
    if (metrics.nodesExplored >= maxNodes) { truncated = true; return; }
    metrics.nodesExplored += 1;
    metrics.maxDepth = Math.max(metrics.maxDepth, depth);
    if (rest.length === 0) { terminal(grid, skipped); return; }

    let selectedIndex = 0;
    let selectedCandidates = candidatesFor(grid, rest[0]!);
    metrics.candidateSetsEvaluated += 1;
    if ((options.entryOrdering ?? 'mrv') === 'mrv') {
      for (let index = 1; index < rest.length; index += 1) {
        const candidates = candidatesFor(grid, rest[index]!);
        metrics.candidateSetsEvaluated += 1;
        if (candidates.length > 0 && (selectedCandidates.length === 0 || candidates.length < selectedCandidates.length ||
          (candidates.length === selectedCandidates.length && rest[index]!.answer.localeCompare(rest[selectedIndex]!.answer) < 0))) {
          selectedIndex = index; selectedCandidates = candidates;
        }
      }
      metrics.mrvSelections += 1;
    }
    const entry = rest[selectedIndex]!;
    const remaining = rest.filter((_, index) => index !== selectedIndex);
    if (selectedCandidates.length === 0) metrics.deadEnds += 1;
    for (const candidate of selectedCandidates) {
      metrics.placementsTried += 1;
      explore(candidate.grid, remaining, skipped, depth + 1);
      metrics.backtracks += 1;
      if (truncated) return;
    }
    explore(grid, remaining, [...skipped, entry], depth + 1);
    metrics.backtracks += 1;
  }

  explore(initialGrid, pending, [], initialGrid.placements.length);
  return { grid: bestGrid, unplaced: bestUnplaced, metrics, truncated, paretoFront };
}
