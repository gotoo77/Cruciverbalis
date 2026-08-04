import type { HumanComparisonArtifact, HumanComparisonVote } from './pairwise-comparison';
import {
  analyzeHumanComparisonArtifact,
  analyzeHumanComparisonVotes,
  type HumanFeedbackAnalysis,
  type HumanPreferenceDirection,
} from './human-feedback-analysis';
import type { MorphologyMetric } from '../quality/morphology-discriminants';

export interface HumanFeedbackCorpusEntry {
  readonly id: string;
  readonly artifact: HumanComparisonArtifact;
}

export interface HumanFeedbackCorpusMetricAgreement {
  readonly metric: MorphologyMetric;
  readonly artifactCountWithEvidence: number;
  readonly lowerArtifacts: number;
  readonly higherArtifacts: number;
  readonly mixedArtifacts: number;
  readonly noneArtifacts: number;
  readonly consensusDirection: HumanPreferenceDirection;
  readonly consensusStrength: number;
}

export interface HumanFeedbackCorpusAnalysis {
  readonly artifactCount: number;
  readonly totalVoteCount: number;
  readonly pooled: HumanFeedbackAnalysis;
  readonly perArtifact: readonly {
    readonly id: string;
    readonly analysis: HumanFeedbackAnalysis;
  }[];
  readonly metricAgreement: readonly HumanFeedbackCorpusMetricAgreement[];
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

/**
 * Aggregates several independently exported human-comparison artifacts while
 * preserving the distinction between pooled votes and cross-artifact agreement.
 * No solver preference is inferred from this analysis.
 */
export function analyzeHumanFeedbackCorpus(
  entries: readonly HumanFeedbackCorpusEntry[],
): HumanFeedbackCorpusAnalysis {
  const perArtifact = entries.map(({ id, artifact }) => ({
    id,
    analysis: analyzeHumanComparisonArtifact(artifact),
  }));
  const allVotes: HumanComparisonVote[] = entries.flatMap(({ artifact }) => [...artifact.votes]);
  const pooled = analyzeHumanComparisonVotes(allVotes);

  const metricAgreement = METRICS.map((metric) => {
    let lowerArtifacts = 0;
    let higherArtifacts = 0;
    let mixedArtifacts = 0;
    let noneArtifacts = 0;

    for (const { analysis } of perArtifact) {
      const signal = analysis.metricSignals.find((candidate) => candidate.metric === metric);
      const direction = signal?.preferredDirection ?? 'none';
      if (direction === 'lower') lowerArtifacts += 1;
      else if (direction === 'higher') higherArtifacts += 1;
      else if (direction === 'mixed') mixedArtifacts += 1;
      else noneArtifacts += 1;
    }

    const artifactCountWithEvidence = lowerArtifacts + higherArtifacts + mixedArtifacts;
    const directionalArtifacts = lowerArtifacts + higherArtifacts;
    let consensusDirection: HumanPreferenceDirection = 'none';
    if (directionalArtifacts > 0) {
      if (lowerArtifacts > higherArtifacts) consensusDirection = 'lower';
      else if (higherArtifacts > lowerArtifacts) consensusDirection = 'higher';
      else consensusDirection = 'mixed';
    } else if (mixedArtifacts > 0) {
      consensusDirection = 'mixed';
    }

    const consensusStrength = directionalArtifacts === 0
      ? 0
      : Math.abs(lowerArtifacts - higherArtifacts) / directionalArtifacts;

    return {
      metric,
      artifactCountWithEvidence,
      lowerArtifacts,
      higherArtifacts,
      mixedArtifacts,
      noneArtifacts,
      consensusDirection,
      consensusStrength,
    } satisfies HumanFeedbackCorpusMetricAgreement;
  }).sort((left, right) => {
    if (right.artifactCountWithEvidence !== left.artifactCountWithEvidence) {
      return right.artifactCountWithEvidence - left.artifactCountWithEvidence;
    }
    if (right.consensusStrength !== left.consensusStrength) {
      return right.consensusStrength - left.consensusStrength;
    }
    return left.metric.localeCompare(right.metric);
  });

  return {
    artifactCount: entries.length,
    totalVoteCount: allVotes.length,
    pooled,
    perArtifact,
    metricAgreement,
  };
}
