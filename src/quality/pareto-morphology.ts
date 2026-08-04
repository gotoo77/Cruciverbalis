import type { DomainGrid } from '../core/domain';
import { gridQualitySignature, type QualityBearingSolution } from './pareto-analysis';
import {
  gridMorphologySignature,
  measureGridMorphology,
  type GridMorphology,
} from './grid-morphology';

export interface MorphologyBearingSolution extends QualityBearingSolution {
  readonly grid: DomainGrid;
}

export interface ParetoMorphologyFamily<T extends MorphologyBearingSolution = MorphologyBearingSolution> {
  readonly morphology: GridMorphology;
  readonly solutions: readonly T[];
}

export interface ParetoMorphologyAnalysis<T extends MorphologyBearingSolution = MorphologyBearingSolution> {
  readonly solutionCount: number;
  readonly morphologyProfileCount: number;
  readonly repeatedMorphologyProfileCount: number;
  readonly largestMorphologyFamilySize: number;
  readonly qualityProfilesSplitByMorphology: number;
  readonly families: readonly ParetoMorphologyFamily<T>[];
}

/**
 * Describes how much structural diversity remains after current GridQuality grouping.
 * Morphology profiles are observations only: this function does not merge solutions
 * and none of these metrics participates in Pareto dominance yet.
 */
export function analyzeParetoMorphology<T extends MorphologyBearingSolution>(
  solutions: readonly T[],
): ParetoMorphologyAnalysis<T> {
  const morphologyGroups = new Map<
    string,
    { morphology: GridMorphology; solutions: T[] }
  >();
  const morphologyByQuality = new Map<string, Set<string>>();

  for (const solution of solutions) {
    const morphology = measureGridMorphology(solution.grid);
    const morphologySignature = gridMorphologySignature(morphology);
    const group = morphologyGroups.get(morphologySignature);
    if (group) group.solutions.push(solution);
    else morphologyGroups.set(morphologySignature, { morphology, solutions: [solution] });

    const qualitySignature = gridQualitySignature(solution.quality);
    const profiles = morphologyByQuality.get(qualitySignature);
    if (profiles) profiles.add(morphologySignature);
    else morphologyByQuality.set(qualitySignature, new Set([morphologySignature]));
  }

  const families = [...morphologyGroups.values()]
    .map(({ morphology, solutions: members }) => ({
      morphology,
      solutions: members as readonly T[],
    }))
    .sort((left, right) => {
      if (right.solutions.length !== left.solutions.length) {
        return right.solutions.length - left.solutions.length;
      }
      return gridMorphologySignature(left.morphology).localeCompare(
        gridMorphologySignature(right.morphology),
      );
    });

  return {
    solutionCount: solutions.length,
    morphologyProfileCount: families.length,
    repeatedMorphologyProfileCount: families.filter((family) => family.solutions.length > 1).length,
    largestMorphologyFamilySize: families.reduce(
      (largest, family) => Math.max(largest, family.solutions.length),
      0,
    ),
    qualityProfilesSplitByMorphology: [...morphologyByQuality.values()].filter(
      (profiles) => profiles.size > 1,
    ).length,
    families,
  };
}
