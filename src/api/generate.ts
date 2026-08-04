import type { DomainGrid, Entry } from '../core/domain';
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
}

function generatedGrid(grid: DomainGrid, unplaced: readonly Entry[]): GeneratedGrid {
  return {
    grid,
    unplaced: [...unplaced],
    quality: measureGridQuality(grid),
  };
}

/**
 * Stable application-facing entry point for crossword generation.
 *
 * UI and external consumers should depend on this function instead of calling
 * individual solver implementations directly.
 */
export function generate(request: GenerationRequest): GenerationResult {
  const strategy = request.strategy ?? 'backtracking';

  if (strategy === 'greedy') {
    const result = solveGreedy(request.entries);
    return {
      strategy,
      solutions: [generatedGrid(result.grid, result.unplaced)],
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
    return {
      strategy,
      solutions: result.paretoFront.map(({ grid, unplaced, quality }) => ({
        grid,
        unplaced,
        quality,
      })),
      search: result.metrics,
      truncated: result.truncated,
    };
  }

  const result = solveBacktracking(request.entries, options);
  return {
    strategy,
    solutions: [generatedGrid(result.grid, result.unplaced)],
    search: result.metrics,
    truncated: result.truncated,
  };
}
