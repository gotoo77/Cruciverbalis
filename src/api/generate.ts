import type { DomainGrid, Entry } from '../core/domain';
import { checkEditorialLocks, type EditorialLockConflict, type EditorialLockSet } from '../artifacts/editorial-lock-set';
import { measureGridQuality, type GridQuality } from '../quality/grid-quality';
import {
  solveBacktracking,
  solveParetoBacktracking,
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
  /** Conflicts observed when generated candidates violate human editorial locks. */
  readonly lockConflicts?: readonly EditorialLockConflict[];
}

function generatedGrid(grid: DomainGrid, unplaced: readonly Entry[]): GeneratedGrid {
  return {
    grid,
    unplaced: [...unplaced],
    quality: measureGridQuality(grid),
  };
}

function applyEditorialLocks(
  solutions: readonly GeneratedGrid[],
  lockSet: EditorialLockSet | undefined,
): Pick<GenerationResult, 'solutions' | 'lockConflicts'> {
  if (!lockSet) {
    return { solutions };
  }

  const accepted: GeneratedGrid[] = [];
  const conflicts: EditorialLockConflict[] = [];
  for (const solution of solutions) {
    const check = checkEditorialLocks(solution.grid, lockSet);
    if (check.respected) {
      accepted.push(solution);
    } else {
      conflicts.push(...check.conflicts);
    }
  }

  return {
    solutions: accepted,
    lockConflicts: conflicts,
  };
}

/**
 * Stable application-facing entry point for crossword generation.
 *
 * UI and external consumers should depend on this function instead of calling
 * individual solver implementations directly. When editorial locks are
 * supplied, incompatible derivations are rejected explicitly; locks are never
 * relaxed or converted into a ranking score.
 */
export function generate(request: GenerationRequest): GenerationResult {
  const strategy = request.strategy ?? 'backtracking';

  if (strategy === 'greedy') {
    const result = solveGreedy(request.entries);
    const locked = applyEditorialLocks(
      [generatedGrid(result.grid, result.unplaced)],
      request.editorialLocks,
    );
    return {
      strategy,
      ...locked,
      truncated: false,
    };
  }

  const options = {
    maxNodes: request.maxNodes,
    entryOrdering: request.entryOrdering,
    branchAndBound: request.branchAndBound,
  };

  if (strategy === 'pareto') {
    const result = solveParetoBacktracking(request.entries, options);
    const locked = applyEditorialLocks(
      result.paretoFront.map(({ grid, unplaced, quality }) => ({ grid, unplaced, quality })),
      request.editorialLocks,
    );
    return {
      strategy,
      ...locked,
      search: result.metrics,
      truncated: result.truncated,
    };
  }

  const result = solveBacktracking(request.entries, options);
  const locked = applyEditorialLocks(
    [generatedGrid(result.grid, result.unplaced)],
    request.editorialLocks,
  );
  return {
    strategy,
    ...locked,
    search: result.metrics,
    truncated: result.truncated,
  };
}
