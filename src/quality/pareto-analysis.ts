import type { GridQuality } from './grid-quality';

export interface QualityBearingSolution {
  readonly quality: GridQuality;
}

export interface ParetoQualityFamily<T extends QualityBearingSolution = QualityBearingSolution> {
  readonly quality: GridQuality;
  readonly solutions: readonly T[];
}

export interface ParetoFrontAnalysis<T extends QualityBearingSolution = QualityBearingSolution> {
  readonly solutionCount: number;
  readonly qualityProfileCount: number;
  readonly repeatedQualityProfileCount: number;
  readonly solutionsInRepeatedProfiles: number;
  readonly largestQualityFamilySize: number;
  readonly families: readonly ParetoQualityFamily<T>[];
}

/** Stable, exact signature for one currently modelled GridQuality vector. */
export function gridQualitySignature(quality: GridQuality): string {
  return [
    quality.placedEntries,
    quality.crossings,
    quality.area,
    quality.density,
    quality.directionBalance,
  ].join('|');
}

/**
 * Characterizes diversity inside an already-computed Pareto front.
 *
 * This intentionally does not merge solutions that merely share the same
 * quality vector. A quality family is an observation group, not an equivalence
 * class: geometrically distinct grids may currently receive identical metrics.
 */
export function analyzeParetoFront<T extends QualityBearingSolution>(
  solutions: readonly T[],
): ParetoFrontAnalysis<T> {
  const grouped = new Map<string, { quality: GridQuality; solutions: T[] }>();

  for (const solution of solutions) {
    const signature = gridQualitySignature(solution.quality);
    const family = grouped.get(signature);
    if (family) {
      family.solutions.push(solution);
    } else {
      grouped.set(signature, { quality: solution.quality, solutions: [solution] });
    }
  }

  const families = [...grouped.values()]
    .map(({ quality, solutions: members }) => ({ quality, solutions: members as readonly T[] }))
    .sort((left, right) => {
      if (right.solutions.length !== left.solutions.length) {
        return right.solutions.length - left.solutions.length;
      }
      return gridQualitySignature(left.quality).localeCompare(gridQualitySignature(right.quality));
    });

  const repeatedFamilies = families.filter((family) => family.solutions.length > 1);

  return {
    solutionCount: solutions.length,
    qualityProfileCount: families.length,
    repeatedQualityProfileCount: repeatedFamilies.length,
    solutionsInRepeatedProfiles: repeatedFamilies.reduce(
      (total, family) => total + family.solutions.length,
      0,
    ),
    largestQualityFamilySize: families.reduce(
      (largest, family) => Math.max(largest, family.solutions.length),
      0,
    ),
    families,
  };
}
