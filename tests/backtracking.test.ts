import { describe, expect, it } from 'vitest';
import { dominates } from '../src/quality/grid-quality';
import { solveBacktracking, solveParetoBacktracking } from '../src/solver/backtracking';

const answers = (result: ReturnType<typeof solveBacktracking>) =>
  result.grid.placements.map(({ entry }) => entry.answer).sort();

describe('backtracking solver', () => {
  it('returns an empty result for an empty input', () => {
    const result = solveBacktracking([]);

    expect(result.grid.placements).toHaveLength(0);
    expect(result.unplaced).toHaveLength(0);
    expect(result.metrics.nodesExplored).toBe(0);
    expect(result.metrics.branchesPruned).toBe(0);
    expect(result.metrics.candidateAnchorsEvaluated).toBe(0);
    expect(result.metrics.crossingIndexesBuilt).toBe(0);
    expect(result.metrics.entryLetterIndexesBuilt).toBe(0);
    expect(result.metrics.forwardChecks).toBe(0);
    expect(result.metrics.entriesForcedUnplaced).toBe(0);
    expect(result.metrics.forwardCheckPrunes).toBe(0);
    expect(result.paretoFront).toHaveLength(0);
    expect(result.truncated).toBe(false);
  });

  it('explores alternatives and exposes search metrics', () => {
    const result = solveBacktracking([
      { answer: 'CHAT' },
      { answer: 'TACHE' },
      { answer: 'HACHE' },
      { answer: 'THE' },
    ]);

    expect(result.grid.placements.length).toBeGreaterThanOrEqual(3);
    expect(result.metrics.nodesExplored).toBeGreaterThan(1);
    expect(result.metrics.placementsTried).toBeGreaterThan(0);
    expect(result.metrics.backtracks).toBeGreaterThan(0);
    expect(result.metrics.solutionsFound).toBeGreaterThan(0);
    expect(result.metrics.mrvSelections).toBeGreaterThan(0);
    expect(result.metrics.candidateSetsEvaluated).toBeGreaterThan(0);
    expect(result.metrics.candidateAnchorsEvaluated).toBeGreaterThan(0);
    expect(result.metrics.crossingIndexesBuilt).toBeGreaterThan(0);
    expect(result.metrics.entryLetterIndexesBuilt).toBe(4);
    expect(result.metrics.forwardChecks).toBeGreaterThan(0);
  });

  it('keeps disconnected entries explicit instead of inventing filler', () => {
    const result = solveBacktracking([
      { answer: 'CHAT' },
      { answer: 'CHIEN' },
      { answer: 'XYZ' },
    ]);

    expect(answers(result)).toContain('CHIEN');
    expect(result.unplaced.map(({ answer }) => answer)).toContain('XYZ');
    expect(result.metrics.entriesForcedUnplaced).toBeGreaterThan(0);
  });

  it('preserves words whose immediate MRV domain is empty but can become reachable later', () => {
    const result = solveBacktracking([
      { answer: 'ABCDE' },
      { answer: 'DEF' },
      { answer: 'FGH' },
    ]);

    expect(answers(result)).toEqual(['ABCDE', 'DEF', 'FGH']);
    expect(result.unplaced).toHaveLength(0);
  });

  it('reduces search by forcing lexically unreachable components out of the branch', () => {
    const entries = [
      { answer: 'ABCDE' },
      { answer: 'DEF' },
      { answer: 'FGH' },
      { answer: 'XYZ' },
      { answer: 'QYX' },
    ];

    const checked = solveBacktracking(entries, { forwardChecking: true, branchAndBound: false });
    const unchecked = solveBacktracking(entries, { forwardChecking: false, branchAndBound: false });

    expect(answers(checked)).toEqual(answers(unchecked));
    expect(checked.unplaced.map(({ answer }) => answer).sort()).toEqual(
      unchecked.unplaced.map(({ answer }) => answer).sort(),
    );
    expect(checked.metrics.entriesForcedUnplaced).toBeGreaterThan(0);
    expect(unchecked.metrics.entriesForcedUnplaced).toBe(0);
    expect(checked.metrics.nodesExplored).toBeLessThan(unchecked.metrics.nodesExplored);
  });

  it('is deterministic for the same input', () => {
    const entries = [
      { answer: 'MAISON' },
      { answer: 'SOURIS' },
      { answer: 'RAISON' },
      { answer: 'MARS' },
    ];

    const first = solveBacktracking(entries);
    const second = solveBacktracking(entries);

    expect(first.grid.placements).toEqual(second.grid.placements);
    expect(first.unplaced).toEqual(second.unplaced);
    expect(first.metrics).toEqual(second.metrics);
  });

  it('can retain the historical fixed ordering for comparison', () => {
    const entries = [
      { answer: 'MAISON' },
      { answer: 'SOURIS' },
      { answer: 'RAISON' },
      { answer: 'MARS' },
      { answer: 'SOIN' },
    ];

    const fixed = solveBacktracking(entries, { entryOrdering: 'fixed' });
    const mrv = solveBacktracking(entries, { entryOrdering: 'mrv' });

    expect(fixed.metrics.mrvSelections).toBe(0);
    expect(mrv.metrics.mrvSelections).toBeGreaterThan(0);
    expect(answers(mrv)).toEqual(answers(solveBacktracking(entries)));
  });

  it('réutilise un seul index de grille pour tous les domaines MRV d un nœud', () => {
    const result = solveBacktracking([
      { answer: 'TACHE' },
      { answer: 'CHAT' },
      { answer: 'HACHE' },
      { answer: 'THE' },
      { answer: 'CACHE' },
    ]);

    expect(result.metrics.candidateSetsEvaluated).toBeGreaterThan(result.metrics.crossingIndexesBuilt);
    expect(result.metrics.entryLetterIndexesBuilt).toBe(5);
    expect(result.metrics.crossingIndexesBuilt).toBeLessThanOrEqual(result.metrics.nodesExplored);
  });

  it('makes MRV candidate comparison cost observable', () => {
    const entries = [
      { answer: 'TACHE' },
      { answer: 'CHAT' },
      { answer: 'HACHE' },
      { answer: 'THE' },
    ];

    const fixed = solveBacktracking(entries, { entryOrdering: 'fixed' });
    const mrv = solveBacktracking(entries, { entryOrdering: 'mrv' });

    expect(fixed.metrics.mrvSelections).toBe(0);
    expect(mrv.metrics.candidateSetsEvaluated).toBeGreaterThan(mrv.metrics.mrvSelections);
    expect(mrv.metrics.candidateAnchorsEvaluated).toBeGreaterThan(0);
  });

  it('prunes branches that cannot beat the incumbent', () => {
    const entries = [
      { answer: 'TACHE' },
      { answer: 'CHAT' },
      { answer: 'HACHE' },
      { answer: 'THE' },
    ];

    const bounded = solveBacktracking(entries, { branchAndBound: true });
    const exhaustive = solveBacktracking(entries, { branchAndBound: false });

    expect(bounded.metrics.branchesPruned).toBeGreaterThan(0);
    expect(exhaustive.metrics.branchesPruned).toBe(0);
    expect(bounded.metrics.nodesExplored).toBeLessThan(exhaustive.metrics.nodesExplored);
    expect(answers(bounded)).toEqual(answers(exhaustive));
    expect(bounded.unplaced).toEqual(exhaustive.unplaced);
  });

  it('does not prune branches that could still tie on completeness and improve compactness', () => {
    const result = solveBacktracking(
      [
        { answer: 'TACHE' },
        { answer: 'CHAT' },
        { answer: 'HACHE' },
        { answer: 'THE' },
      ],
      { branchAndBound: true },
    );

    expect(result.metrics.solutionsFound).toBeGreaterThan(0);
    expect(result.truncated).toBe(false);
  });

  it('maintains a non-dominated Pareto front during exhaustive search', () => {
    const result = solveParetoBacktracking([
      { answer: 'TACHE' },
      { answer: 'CHAT' },
      { answer: 'HACHE' },
      { answer: 'THE' },
    ]);

    expect(result.paretoFront.length).toBeGreaterThan(0);
    expect(result.metrics.paretoCandidates).toBeGreaterThan(0);
    expect(result.metrics.paretoAccepted).toBeGreaterThan(0);

    for (let candidateIndex = 0; candidateIndex < result.paretoFront.length; candidateIndex += 1) {
      const candidate = result.paretoFront[candidateIndex];
      if (!candidate) continue;
      for (let otherIndex = 0; otherIndex < result.paretoFront.length; otherIndex += 1) {
        if (candidateIndex === otherIndex) continue;
        const other = result.paretoFront[otherIndex];
        if (!other) continue;
        expect(dominates(other.quality, candidate.quality)).toBe(false);
      }
    }
  });

  it('disables the scalar branch-and-bound proof while collecting Pareto solutions', () => {
    const result = solveParetoBacktracking(
      [
        { answer: 'TACHE' },
        { answer: 'CHAT' },
        { answer: 'HACHE' },
        { answer: 'THE' },
      ],
      { branchAndBound: true },
    );

    expect(result.metrics.branchesPruned).toBe(0);
    expect(result.paretoFront.length).toBeGreaterThan(0);
  });

  it('honours the node budget and reports truncation', () => {
    const result = solveBacktracking(
      [
        { answer: 'MAISON' },
        { answer: 'SOURIS' },
        { answer: 'RAISON' },
        { answer: 'MARS' },
        { answer: 'SOIN' },
      ],
      { maxNodes: 1 },
    );

    expect(result.truncated).toBe(true);
    expect(result.metrics.nodesExplored).toBe(1);
  });
});
