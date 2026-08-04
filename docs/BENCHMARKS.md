# Benchmarks

Cruciverbalis compares solver strategies on stable reference fixtures instead of relying on intuition alone.

The benchmark suite records two different classes of information:

- **quality**: placed entries, unplaced entries and bounding-box area;
- **search effort**: explored nodes, attempted placements, backtracks, dead ends, MRV work and pruned branches.

Wall-clock time is recorded for observation but is deliberately **not** used as a regression assertion. Runtime depends on the machine, process scheduling and JavaScript engine state; structural search metrics are more reproducible.

The default comparison is:

1. greedy;
2. fixed-order backtracking without branch-and-bound;
3. MRV backtracking without branch-and-bound;
4. MRV backtracking with branch-and-bound.

A solver optimization must not be declared better merely because it sounds smarter. It should improve a measured objective while preserving the required quality properties.

The reference fixtures live in `src/benchmark/fixtures.ts` and are intentionally small enough to run in CI. Larger performance corpora can be added later without turning the normal test suite into a stress test.
