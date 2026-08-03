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

  it('evaluates more candidate sets when MRV compares pending entries', () => {
    const entries = [
      { answer: 'TACHE' },
      { answer: 'CHAT' },
      { answer: 'HACHE' },
      { answer: 'THE' },
    ];

    const fixed = solveBacktracking(entries, { entryOrdering: 'fixed' });
    const mrv = solveBacktracking(entries, { entryOrdering: 'mrv' });

    expect(mrv.metrics.candidateSetsEvaluated).toBeGreaterThanOrEqual(
      fixed.metrics.candidateSetsEvaluated,
    );
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
