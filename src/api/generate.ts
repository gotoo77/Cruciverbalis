import type { DomainGrid, Entry } from '../core/domain';
import {
  checkEditorialLocks,
  prepareEditorialConstraints,
  type EditorialLockConflict,
  type EditorialLockSet,
} from '../artifacts/editorial-lock-set';
import { measureGridQuality, type GridQuality } from '../quality/grid-quality';
import {
  solveBacktracking,
  solveBacktrackingFromState,
  solveParetoBacktracking,
  solveParetoBacktrackingFromState,
  type EntryOrdering,
  type SearchMetrics,
} from '../solver/backtracking';
import { solveGreedy } from '../solver/greedy';

export type GenerationStrategy = 'greedy' | 'backtracking' | 'pareto';

export interface GenerationRequest {
  readonly entries: readonly Entry[];
  readonly strategy?: GenerationStrategy;
  readonly maxNodes?: number;
  readonly entryOrdering?: EntryOrdering;
  readonly branchAndBound?: boolean;
  /** Human editorial decisions that every returned derivation must respect. */
  readonly editorialLocks?: EditorialLockSet;
}

export interface GeneratedGrid {
  readonly grid: DomainGrid;
  readonly unplaced: readonly Entry[];
  readonly quality: GridQuality;
}

export interface GenerationResult {
  readonly strategy: GenerationStrategy;
  readonly solutions: readonly GeneratedGrid[];
  readonly search?: SearchMetrics;
  readonly truncated: boolean;
  readonly lockConflicts?: readonly EditorialLockConflict[];
}

function generatedGrid(grid: DomainGrid, unplaced: readonly Entry[]): GeneratedGrid {
  return { grid, unplaced: [...unplaced], quality: measureGridQuality(grid) };
}

function applyEditorialLocks(
  solutions: readonly GeneratedGrid[],
  lockSet: EditorialLockSet | undefined,
): Pick<GenerationResult, 'solutions' | 'lockConflicts'> {
  if (!lockSet) return { solutions };
  const accepted: GeneratedGrid[] = [];
  const conflicts: EditorialLockConflict[] = [];
  for (const solution of solutions) {
    const check = checkEditorialLocks(solution.grid, lockSet);
    if (check.respected) accepted.push(solution);
    else conflicts.push(...check.conflicts);
  }
  return { solutions: accepted, lockConflicts: conflicts };
}

/** Stable application-facing entry point for crossword generation. */
export function generate(request: GenerationRequest): GenerationResult {
  const strategy = request.strategy ?? 'backtracking';

  if (strategy === 'greedy') {
    const result = solveGreedy(request.entries);
    const locked = applyEditorialLocks([generatedGrid(result.grid, result.unplaced)], request.editorialLocks);
    return { strategy, ...locked, truncated: false };
  }

  const prepared = request.editorialLocks
    ? prepareEditorialConstraints(request.entries, request.editorialLocks)
    : undefined;

  if (prepared && prepared.conflicts.length > 0) {
    return { strategy, solutions: [], lockConflicts: prepared.conflicts, truncated: false };
  }

  const options = {
    maxNodes: request.maxNodes,
    entryOrdering: request.entryOrdering,
    branchAndBound: request.branchAndBound,
  };

  if (strategy === 'pareto') {
    const result = prepared
      ? solveParetoBacktrackingFromState(prepared.initialGrid, prepared.remainingEntries, options)
      : solveParetoBacktracking(request.entries, options);
    const locked = applyEditorialLocks(
      result.paretoFront.map(({ grid, unplaced, quality }) => ({ grid, unplaced, quality })),
      request.editorialLocks,
    );
    return { strategy, ...locked, search: result.metrics, truncated: result.truncated };
  }

  const result = prepared
    ? solveBacktrackingFromState(prepared.initialGrid, prepared.remainingEntries, options)
    : solveBacktracking(request.entries, options);
  const locked = applyEditorialLocks([generatedGrid(result.grid, result.unplaced)], request.editorialLocks);
  return { strategy, ...locked, search: result.metrics, truncated: result.truncated };
}
