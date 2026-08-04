import { describe, expect, it } from 'vitest';
import {
  analyzeHumanFeedbackCorpus,
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

function artifact(votes: readonly HumanComparisonVote[], createdAt: string): HumanComparisonArtifact {
  return {
    schema: 'cruciverbalis.human-comparison.v1',
    createdAt,
    pairCount: votes.length,
    votes,
  };
}

describe('human feedback corpus', () => {
  it('keeps pooled evidence and cross-artifact agreement separate', () => {
    const analysis = analyzeHumanFeedbackCorpus([
      {
        id: 'session-a',
        artifact: artifact([
          vote('left', { graphDiameter: 3 }, { graphDiameter: 6 }),
          vote('right', { graphDiameter: 7 }, { graphDiameter: 4 }, 1),
        ], '2026-08-04T09:00:00.000Z'),
      },
      {
        id: 'session-b',
        artifact: artifact([
          vote('left', { graphDiameter: 2 }, { graphDiameter: 5 }),
        ], '2026-08-04T09:05:00.000Z'),
      },
    ]);

    const diameter = analysis.metricAgreement.find(({ metric }) => metric === 'graphDiameter');
    expect(analysis).toMatchObject({ artifactCount: 2, totalVoteCount: 3 });
    expect(analysis.pooled.decisiveVoteCount).toBe(3);
    expect(diameter).toMatchObject({
      artifactCountWithEvidence: 2,
      lowerArtifacts: 2,
      higherArtifacts: 0,
      consensusDirection: 'lower',
      consensusStrength: 1,
    });
  });

  it('reports disagreement between artifacts instead of inventing consensus', () => {
    const analysis = analyzeHumanFeedbackCorpus([
      {
        id: 'lower',
        artifact: artifact([
          vote('left', { width: 8 }, { width: 12 }),
        ], '2026-08-04T09:00:00.000Z'),
      },
      {
        id: 'higher',
        artifact: artifact([
          vote('right', { width: 8 }, { width: 12 }),
        ], '2026-08-04T09:10:00.000Z'),
      },
    ]);

    const width = analysis.metricAgreement.find(({ metric }) => metric === 'width');
    expect(width).toMatchObject({
      lowerArtifacts: 1,
      higherArtifacts: 1,
      consensusDirection: 'mixed',
      consensusStrength: 0,
    });
  });

  it('handles an empty corpus explicitly', () => {
    const analysis = analyzeHumanFeedbackCorpus([]);
    expect(analysis).toMatchObject({ artifactCount: 0, totalVoteCount: 0 });
    expect(analysis.metricAgreement.every(({ consensusDirection }) => consensusDirection === 'none')).toBe(true);
  });
});
