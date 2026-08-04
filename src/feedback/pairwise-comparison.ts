import type { DomainGrid } from '../core/domain';
import { gridMorphologySignature, measureGridMorphology, type GridMorphology } from '../quality/grid-morphology';
import { gridQualitySignature, type QualityBearingSolution } from '../quality/pareto-analysis';
import { translationInvariantPlacementSignature } from '../solver/pareto';

export interface ComparableGridSolution extends QualityBearingSolution {
  readonly grid: DomainGrid;
}

export interface HumanComparisonPair<T extends ComparableGridSolution = ComparableGridSolution> {
  readonly leftIndex: number;
  readonly rightIndex: number;
  readonly left: T;
  readonly right: T;
  readonly qualitySignature: string;
}

export type HumanComparisonDecision = 'left' | 'right' | 'tie' | 'skip';

export interface HumanComparisonVote {
  readonly pairIndex: number;
  readonly leftSolutionId: string;
  readonly rightSolutionId: string;
  readonly decision: HumanComparisonDecision;
  readonly qualitySignature: string;
  readonly leftMorphology: GridMorphology;
  readonly rightMorphology: GridMorphology;
}

export interface HumanComparisonArtifact {
  readonly schema: 'cruciverbalis.human-comparison.v1';
  readonly createdAt: string;
  readonly pairCount: number;
  readonly votes: readonly HumanComparisonVote[];
}

/** Stable identity for a rendered solution, invariant under translation. */
export function comparableSolutionId(solution: ComparableGridSolution): string {
  return `${gridQualitySignature(solution.quality)}::${translationInvariantPlacementSignature(solution.grid)}`;
}

/**
 * Builds a deterministic comparison set that prioritizes the exact ambiguity we
 * currently care about: geometrically different solutions receiving the same
 * GridQuality vector. Pairs with identical morphology signatures are skipped,
 * because they teach us nothing about the morphology dimensions currently under
 * observation.
 */
export function createSameQualityComparisonPairs<T extends ComparableGridSolution>(
  solutions: readonly T[],
  maxPairs = 12,
): readonly HumanComparisonPair<T>[] {
  if (maxPairs <= 0) return [];

  const byQuality = new Map<string, { index: number; solution: T }[]>();
  solutions.forEach((solution, index) => {
    const signature = gridQualitySignature(solution.quality);
    const family = byQuality.get(signature);
    if (family) family.push({ index, solution });
    else byQuality.set(signature, [{ index, solution }]);
  });

  const pairs: HumanComparisonPair<T>[] = [];
  for (const [qualitySignature, family] of byQuality) {
    if (family.length < 2) continue;

    for (let left = 0; left < family.length; left += 1) {
      for (let right = left + 1; right < family.length; right += 1) {
        const leftMember = family[left];
        const rightMember = family[right];
        if (!leftMember || !rightMember) continue;

        const leftMorphology = gridMorphologySignature(measureGridMorphology(leftMember.solution.grid));
        const rightMorphology = gridMorphologySignature(measureGridMorphology(rightMember.solution.grid));
        if (leftMorphology === rightMorphology) continue;

        pairs.push({
          leftIndex: leftMember.index,
          rightIndex: rightMember.index,
          left: leftMember.solution,
          right: rightMember.solution,
          qualitySignature,
        });
        if (pairs.length >= maxPairs) return pairs;
      }
    }
  }

  return pairs;
}

export function createHumanComparisonVote<T extends ComparableGridSolution>(
  pair: HumanComparisonPair<T>,
  pairIndex: number,
  decision: HumanComparisonDecision,
): HumanComparisonVote {
  return {
    pairIndex,
    leftSolutionId: comparableSolutionId(pair.left),
    rightSolutionId: comparableSolutionId(pair.right),
    decision,
    qualitySignature: pair.qualitySignature,
    leftMorphology: measureGridMorphology(pair.left.grid),
    rightMorphology: measureGridMorphology(pair.right.grid),
  };
}

export function createHumanComparisonArtifact(
  votes: readonly HumanComparisonVote[],
  createdAt: string,
): HumanComparisonArtifact {
  return {
    schema: 'cruciverbalis.human-comparison.v1',
    createdAt,
    pairCount: votes.length,
    votes: [...votes],
  };
}
