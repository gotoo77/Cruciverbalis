import type { DomainGrid, Entry } from '../core/domain';
import { solveBacktracking, type SearchMetrics } from '../solver/backtracking';
import { solveGreedy } from '../solver/greedy';
import { benchmarkFixtures, type BenchmarkFixture } from './fixtures';

export type BenchmarkStrategy =
  | 'greedy'
  | 'backtracking-fixed'
  | 'backtracking-mrv'
  | 'backtracking-mrv-bnb';

export interface BenchmarkRow {
  readonly fixtureId: string;
  readonly strategy: BenchmarkStrategy;
  readonly placed: number;
  readonly unplaced: number;
  readonly area: number;
  readonly elapsedMs: number;
  readonly truncated: boolean;
  readonly metrics?: SearchMetrics;
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

function timed<T>(operation: () => T): { readonly value: T; readonly elapsedMs: number } {
  const start = performance.now();
  const value = operation();
  return { value, elapsedMs: performance.now() - start };
}

function runStrategy(
  fixture: BenchmarkFixture,
  strategy: BenchmarkStrategy,
  maxNodes: number,
): BenchmarkRow {
  if (strategy === 'greedy') {
    const { value, elapsedMs } = timed(() => solveGreedy(fixture.entries));
    return {
      fixtureId: fixture.id,
      strategy,
      placed: value.grid.placements.length,
      unplaced: value.unplaced.length,
      area: gridArea(value.grid),
      elapsedMs,
      truncated: false,
    };
  }

  const options =
    strategy === 'backtracking-fixed'
      ? { maxNodes, entryOrdering: 'fixed' as const, branchAndBound: false }
      : strategy === 'backtracking-mrv'
        ? { maxNodes, entryOrdering: 'mrv' as const, branchAndBound: false }
        : { maxNodes, entryOrdering: 'mrv' as const, branchAndBound: true };

  const { value, elapsedMs } = timed(() => solveBacktracking(fixture.entries, options));
  return {
    fixtureId: fixture.id,
    strategy,
    placed: value.grid.placements.length,
    unplaced: value.unplaced.length,
    area: gridArea(value.grid),
    elapsedMs,
    truncated: value.truncated,
    metrics: value.metrics,
  };
}

export interface BenchmarkSuiteOptions {
  readonly fixtures?: readonly BenchmarkFixture[];
  readonly strategies?: readonly BenchmarkStrategy[];
  readonly maxNodes?: number;
}

export function runBenchmarkSuite(options: BenchmarkSuiteOptions = {}): readonly BenchmarkRow[] {
  const fixtures = options.fixtures ?? benchmarkFixtures;
  const strategies = options.strategies ?? [
    'greedy',
    'backtracking-fixed',
    'backtracking-mrv',
    'backtracking-mrv-bnb',
  ];
  const maxNodes = options.maxNodes ?? 100_000;

  return fixtures.flatMap((fixture) =>
    strategies.map((strategy) => runStrategy(fixture, strategy, maxNodes)),
  );
}

export function benchmarkAnswers(entries: readonly Entry[]): readonly string[] {
  return entries.map(({ answer }) => answer).sort();
}
