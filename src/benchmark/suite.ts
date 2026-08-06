import type { Entry } from '../core/domain';
import { measureGridQuality, type GridQuality } from '../quality/grid-quality';
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
  readonly quality: GridQuality;
  readonly elapsedMs: number;
  readonly truncated: boolean;
  readonly metrics?: SearchMetrics;
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
    const quality = measureGridQuality(value.grid);
    return {
      fixtureId: fixture.id,
      strategy,
      placed: quality.placedEntries,
      unplaced: value.unplaced.length,
      area: quality.area,
      quality,
      elapsedMs,
      truncated: false,
    };
  }

  // Le cache de domaines vise MRV, qui réévalue plusieurs domaines sur un même
  // état de grille. En ordre fixe, un seul domaine est évalué par nœud : payer
  // la signature de grille et le stockage du cache y ajoute surtout du coût.
  // On garde donc la stratégie fixed comme témoin historique sans cache.
  const options =
    strategy === 'backtracking-fixed'
      ? {
          maxNodes,
          entryOrdering: 'fixed' as const,
          branchAndBound: false,
          candidateCache: false,
        }
      : strategy === 'backtracking-mrv'
        ? { maxNodes, entryOrdering: 'mrv' as const, branchAndBound: false }
        : { maxNodes, entryOrdering: 'mrv' as const, branchAndBound: true };

  const { value, elapsedMs } = timed(() => solveBacktracking(fixture.entries, options));
  const quality = measureGridQuality(value.grid);
  return {
    fixtureId: fixture.id,
    strategy,
    placed: quality.placedEntries,
    unplaced: value.unplaced.length,
    area: quality.area,
    quality,
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
