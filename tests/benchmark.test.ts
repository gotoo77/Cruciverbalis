import { describe, expect, it } from 'vitest';
import { benchmarkFixtures } from '../src/benchmark/fixtures';
import { runBenchmarkSuite } from '../src/benchmark/suite';

describe('benchmark suite', () => {
  it('runs every reference fixture against every default strategy', () => {
    // Ce test vérifie la couverture fonctionnelle de la matrice de benchmark,
    // pas la capacité à épuiser le budget maximal du solveur. Un budget borné
    // garde le smoke test stable sur les runners CI plus lents tout en exécutant
    // bien chaque fixture contre chaque stratégie.
    const rows = runBenchmarkSuite({ maxNodes: 20_000 });

    expect(rows).toHaveLength(benchmarkFixtures.length * 4);
    expect(new Set(rows.map(({ fixtureId }) => fixtureId)).size).toBe(benchmarkFixtures.length);
    expect(new Set(rows.map(({ strategy }) => strategy))).toEqual(
      new Set([
        'greedy',
        'backtracking-fixed',
        'backtracking-mrv',
        'backtracking-mrv-bnb',
      ]),
    );
  });

  it('reports structural quality and search observability without asserting wall-clock timings', () => {
    const rows = runBenchmarkSuite({ fixtures: [benchmarkFixtures[0]!], maxNodes: 20_000 });

    for (const row of rows) {
      expect(row.placed + row.unplaced).toBe(benchmarkFixtures[0]!.entries.length);
      expect(row.area).toBeGreaterThan(0);
      expect(row.elapsedMs).toBeGreaterThanOrEqual(0);
    }

    const backtrackingRows = rows.filter(({ strategy }) => strategy !== 'greedy');
    for (const row of backtrackingRows) {
      expect(row.metrics).toBeDefined();
      expect(row.metrics!.nodesExplored).toBeGreaterThan(0);
    }
  });

  it('keeps branch-and-bound quality equivalent to the same MRV search without pruning', () => {
    const rows = runBenchmarkSuite({
      fixtures: [benchmarkFixtures[1]!],
      strategies: ['backtracking-mrv', 'backtracking-mrv-bnb'],
      maxNodes: 100_000,
    });

    const plain = rows.find(({ strategy }) => strategy === 'backtracking-mrv');
    const bounded = rows.find(({ strategy }) => strategy === 'backtracking-mrv-bnb');

    expect(plain).toBeDefined();
    expect(bounded).toBeDefined();
    expect(bounded!.placed).toBe(plain!.placed);
    expect(bounded!.unplaced).toBe(plain!.unplaced);
    expect(bounded!.area).toBe(plain!.area);
    expect(bounded!.metrics!.nodesExplored).toBeLessThanOrEqual(plain!.metrics!.nodesExplored);
  });
});
