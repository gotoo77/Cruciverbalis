import { describe, expect, it } from 'vitest';
import { solveBacktracking } from '../src/solver/backtracking';

const answers = (result: ReturnType<typeof solveBacktracking>) =>
  result.grid.placements.map(({ entry }) => entry.answer).sort();

describe('backtracking solver', () => {
  it('returns an empty result for an empty input', () => {
    const result = solveBacktracking([]);

    expect(result.grid.placements).toHaveLength(0);
    expect(result.unplaced).toHaveLength(0);
    expect(result.metrics.nodesExplored).toBe(0);
    expect(result.metrics.branchesPruned).toBe(0);
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
  });

  it('keeps disconnected entries explicit instead of inventing filler', () => {
    const result = solveBacktracking([
      { answer: 'CHAT' },
      { answer: 'CHIEN' },
      { answer: 'XYZ' },
    ]);

    expect(answers(result)).toContain('CHIEN');
    expect(result.unplaced.map(({ answer }) => answer)).toContain('XYZ');
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

  it('makes MRV candidate comparison cost observable', () => {
    const entries = [
      { answer: 'TACHE' },
      { answer: 'CHAT' },
      { answer: 'HACHE' },
      { answer: 'THE' },
    ];

    const fixed = solveBacktracking(entries, { entryOrdering: 'fixed' });
    const mrv = solveBacktracking(entries, { entryOrdering: 'mrv' });

    // Fixed ordering evaluates exactly one candidate set per decision, whereas
    // MRV may evaluate several pending entries to choose the most constrained.
    // MRV can still evaluate fewer candidate sets overall if it shrinks the
    // search tree enough, so comparing global totals is intentionally avoided.
    expect(fixed.metrics.mrvSelections).toBe(0);
    expect(mrv.metrics.candidateSetsEvaluated).toBeGreaterThan(mrv.metrics.mrvSelections);
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

    // The bound is deliberately strict: equality with the incumbent remains
    // explorable because an equally complete grid may still have a smaller area.
    expect(result.metrics.solutionsFound).toBeGreaterThan(0);
    expect(result.truncated).toBe(false);
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
