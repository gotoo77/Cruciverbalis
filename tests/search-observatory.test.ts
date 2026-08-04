import { describe, expect, it } from 'vitest';
import { analyzeSearchObservation } from '../src/observatory/search-observatory';

const metrics = {
  nodesExplored: 100,
  placementsTried: 300,
  backtracks: 25,
  deadEnds: 10,
  solutionsFound: 4,
  maxDepth: 8,
  mrvSelections: 42,
  candidateSetsEvaluated: 60,
  branchesPruned: 50,
  paretoCandidates: 8,
  paretoAccepted: 2,
};

describe('Search observatory', () => {
  it('derives normalized search ratios', () => {
    const observation = analyzeSearchObservation(metrics);
    expect(observation.branchingPressure).toBe(3);
    expect(observation.backtrackRate).toBe(.25);
    expect(observation.deadEndRate).toBe(.1);
    expect(observation.pruningRate).toBeCloseTo(1 / 3);
    expect(observation.paretoAcceptanceRate).toBe(.25);
  });

  it('explains MRV, pruning, backtracking and Pareto deterministically', () => {
    const observation = analyzeSearchObservation(metrics);
    expect(observation.narrative.join(' ')).toContain('MRV');
    expect(observation.narrative.join(' ')).toContain('Branch & Bound');
    expect(observation.narrative.join(' ')).toContain('impasse');
    expect(observation.narrative.join(' ')).toContain('2/8');
  });
});
