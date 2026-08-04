import { describe, expect, it } from 'vitest';
import {
  analyzeHumanComparisonArtifact,
  analyzeHumanComparisonVotes,
  type GridMorphology,
  type HumanComparisonArtifact,
  type HumanComparisonDecision,
  type HumanComparisonVote,
} from '../src/api';

const base: GridMorphology = {
  width: 10,
  height: 8,
  aspectRatio: 1.25,
  exposedEdges: 40,
  leafEntries: 3,
  maxEntryDegree: 4,
  graphDiameter: 5,
};

function vote(
  decision: HumanComparisonDecision,
  left: Partial<GridMorphology>,
  right: Partial<GridMorphology>,
  pairIndex = 0,
): HumanComparisonVote {
  return {
    pairIndex,
    leftSolutionId: `left-${pairIndex}`,
    rightSolutionId: `right-${pairIndex}`,
    decision,
    qualitySignature: 'same-quality',
    leftMorphology: { ...base, ...left },
    rightMorphology: { ...base, ...right },
  };
}

describe('human feedback analysis', () => {
  it('detects a consistent preference for lower morphology values', () => {
    const analysis = analyzeHumanComparisonVotes([
      vote('left', { graphDiameter: 3 }, { graphDiameter: 6 }, 0),
      vote('right', { graphDiameter: 7 }, { graphDiameter: 4 }, 1),
      vote('left', { graphDiameter: 2 }, { graphDiameter: 5 }, 2),
    ]);

    const diameter = analysis.metricSignals.find(({ metric }) => metric === 'graphDiameter');
    expect(diameter).toMatchObject({
      comparableVotes: 3,
      decisiveVotes: 3,
      preferredLower: 3,
      preferredHigher: 0,
      preferredDirection: 'lower',
      consistencyStrength: 1,
    });
  });

  it('keeps ties, skips and non-varying metrics explicit', () => {
    const analysis = analyzeHumanComparisonVotes([
      vote('tie', { width: 8 }, { width: 12 }, 0),
      vote('skip', { width: 9 }, { width: 11 }, 1),
      vote('left', { width: 7 }, { width: 10 }, 2),
    ]);

    const width = analysis.metricSignals.find(({ metric }) => metric === 'width');
    const height = analysis.metricSignals.find(({ metric }) => metric === 'height');

    expect(width).toMatchObject({ comparableVotes: 3, ties: 1, skipped: 1, decisiveVotes: 1 });
    expect(height).toMatchObject({ comparableVotes: 0, decisiveVotes: 0, preferredDirection: 'none' });
    expect(analysis).toMatchObject({ voteCount: 3, decisiveVoteCount: 1, tieCount: 1, skippedCount: 1 });
  });

  it('reports mixed evidence instead of inventing a direction', () => {
    const analysis = analyzeHumanComparisonVotes([
      vote('left', { aspectRatio: 1.1 }, { aspectRatio: 1.8 }, 0),
      vote('right', { aspectRatio: 1.2 }, { aspectRatio: 1.9 }, 1),
    ]);

    const aspect = analysis.metricSignals.find(({ metric }) => metric === 'aspectRatio');
    expect(aspect).toMatchObject({
      preferredLower: 1,
      preferredHigher: 1,
      preferredDirection: 'mixed',
      consistencyStrength: 0,
    });
  });

  it('analyzes the exported v1 artifact without changing its schema', () => {
    const artifact: HumanComparisonArtifact = {
      schema: 'cruciverbalis.human-comparison.v1',
      createdAt: '2026-08-04T09:00:00.000Z',
      pairCount: 1,
      votes: [vote('left', { leafEntries: 2 }, { leafEntries: 5 })],
    };

    expect(analyzeHumanComparisonArtifact(artifact).voteCount).toBe(1);
    expect(artifact.schema).toBe('cruciverbalis.human-comparison.v1');
  });
});
