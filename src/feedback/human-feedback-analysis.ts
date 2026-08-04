import type { HumanComparisonArtifact, HumanComparisonVote } from './pairwise-comparison';
import type { MorphologyMetric } from '../quality/morphology-discriminants';

export type HumanPreferenceDirection = 'lower' | 'higher' | 'mixed' | 'none';

export interface HumanMorphologyPreferenceSignal {
  readonly metric: MorphologyMetric;
  /** Votes where the compared grids actually differ on this metric. */
  readonly comparableVotes: number;
  readonly preferredLower: number;
  readonly preferredHigher: number;
  readonly ties: number;
  readonly skipped: number;
  /** Decisive votes only: preferredLower + preferredHigher. */
  readonly decisiveVotes: number;
  /** Share of decisive votes preferring the smaller numeric value. */
  readonly lowerPreferenceRate: number;
  /** Share of decisive votes preferring the larger numeric value. */
  readonly higherPreferenceRate: number;
  /** Absolute imbalance between lower and higher preferences, in [0, 1]. */
  readonly consistencyStrength: number;
  readonly preferredDirection: HumanPreferenceDirection;
}

export interface HumanFeedbackAnalysis {
  readonly voteCount: number;
  readonly decisiveVoteCount: number;
  readonly tieCount: number;
  readonly skippedCount: number;
  readonly metricSignals: readonly HumanMorphologyPreferenceSignal[];
}

const METRICS: readonly MorphologyMetric[] = [
  'width',
  'height',
  'aspectRatio',
  'exposedEdges',
  'leafEntries',
  'maxEntryDegree',
  'graphDiameter',
];

function preferredSideValue(
  vote: HumanComparisonVote,
  metric: MorphologyMetric,
): { preferred: number; other: number } | undefined {
  if (vote.decision !== 'left' && vote.decision !== 'right') return undefined;

  return vote.decision === 'left'
    ? { preferred: vote.leftMorphology[metric], other: vote.rightMorphology[metric] }
    : { preferred: vote.rightMorphology[metric], other: vote.leftMorphology[metric] };
}

/**
 * Describes whether human choices correlate with lower or higher values of each
 * morphology metric. This is evidence collection only: it does not create a
 * score, preference policy or solver objective.
 */
export function analyzeHumanComparisonVotes(
  votes: readonly HumanComparisonVote[],
): HumanFeedbackAnalysis {
  const metricSignals = METRICS.map((metric) => {
    let comparableVotes = 0;
    let preferredLower = 0;
    let preferredHigher = 0;
    let ties = 0;
    let skipped = 0;

    for (const vote of votes) {
      const left = vote.leftMorphology[metric];
      const right = vote.rightMorphology[metric];
      if (left === right) continue;

      comparableVotes += 1;
      if (vote.decision === 'tie') {
        ties += 1;
        continue;
      }
      if (vote.decision === 'skip') {
        skipped += 1;
        continue;
      }

      const values = preferredSideValue(vote, metric);
      if (!values) continue;
      if (values.preferred < values.other) preferredLower += 1;
      else preferredHigher += 1;
    }

    const decisiveVotes = preferredLower + preferredHigher;
    const lowerPreferenceRate = decisiveVotes === 0 ? 0 : preferredLower / decisiveVotes;
    const higherPreferenceRate = decisiveVotes === 0 ? 0 : preferredHigher / decisiveVotes;
    const consistencyStrength = decisiveVotes === 0
      ? 0
      : Math.abs(preferredLower - preferredHigher) / decisiveVotes;

    let preferredDirection: HumanPreferenceDirection = 'none';
    if (decisiveVotes > 0) {
      if (preferredLower > preferredHigher) preferredDirection = 'lower';
      else if (preferredHigher > preferredLower) preferredDirection = 'higher';
      else preferredDirection = 'mixed';
    }

    return {
      metric,
      comparableVotes,
      preferredLower,
      preferredHigher,
      ties,
      skipped,
      decisiveVotes,
      lowerPreferenceRate,
      higherPreferenceRate,
      consistencyStrength,
      preferredDirection,
    } satisfies HumanMorphologyPreferenceSignal;
  }).sort((left, right) => {
    if (right.decisiveVotes !== left.decisiveVotes) return right.decisiveVotes - left.decisiveVotes;
    if (right.consistencyStrength !== left.consistencyStrength) {
      return right.consistencyStrength - left.consistencyStrength;
    }
    return left.metric.localeCompare(right.metric);
  });

  return {
    voteCount: votes.length,
    decisiveVoteCount: votes.filter(({ decision }) => decision === 'left' || decision === 'right').length,
    tieCount: votes.filter(({ decision }) => decision === 'tie').length,
    skippedCount: votes.filter(({ decision }) => decision === 'skip').length,
    metricSignals,
  };
}

export function analyzeHumanComparisonArtifact(
  artifact: HumanComparisonArtifact,
): HumanFeedbackAnalysis {
  return analyzeHumanComparisonVotes(artifact.votes);
}
