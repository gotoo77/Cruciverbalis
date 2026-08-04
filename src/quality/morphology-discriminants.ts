import type { GridQuality } from './grid-quality';
import { gridQualitySignature } from './pareto-analysis';
import {
  measureGridMorphology,
  type GridMorphology,
} from './grid-morphology';
import type { MorphologyBearingSolution } from './pareto-morphology';

export type MorphologyMetric = keyof GridMorphology;

export interface MorphologyObservation {
  readonly quality: GridQuality;
  readonly morphology: GridMorphology;
}

export interface MorphologyDiscriminant {
  readonly metric: MorphologyMetric;
  /** Number of repeated quality families inspected. */
  readonly repeatedQualityFamilies: number;
  /** Number of those families in which this metric takes at least two values. */
  readonly varyingQualityFamilies: number;
  /** Share of repeated quality families separated by this metric, in [0, 1]. */
  readonly discriminationRate: number;
  /** Largest number of distinct values seen inside a single quality family. */
  readonly maxDistinctValuesInFamily: number;
  /** Largest numeric span (max - min) seen inside a single quality family. */
  readonly maxSpread: number;
}

export interface MorphologyDiscriminantAnalysis {
  readonly repeatedQualityFamilyCount: number;
  readonly repeatedQualityFamiliesSplitByAnyMorphologyMetric: number;
  readonly discriminants: readonly MorphologyDiscriminant[];
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
 * Measures which morphology dimensions actually separate solutions that current
 * GridQuality considers equal. This is descriptive only: it does not change
 * equivalence or Pareto dominance.
 */
export function analyzeMorphologyObservations(
  observations: readonly MorphologyObservation[],
): MorphologyDiscriminantAnalysis {
  const grouped = new Map<string, MorphologyObservation[]>();
  for (const observation of observations) {
    const signature = gridQualitySignature(observation.quality);
    const family = grouped.get(signature);
    if (family) family.push(observation);
    else grouped.set(signature, [observation]);
  }

  const repeatedFamilies = [...grouped.values()].filter((family) => family.length > 1);
  let splitByAny = 0;

  const accumulators = new Map<
    MorphologyMetric,
    { varying: number; maxDistinct: number; maxSpread: number }
  >(
    METRICS.map((metric) => [
      metric,
      { varying: 0, maxDistinct: 1, maxSpread: 0 },
    ]),
  );

  for (const family of repeatedFamilies) {
    let familySplit = false;
    for (const metric of METRICS) {
      const values = family.map(({ morphology }) => morphology[metric]);
      const distinct = new Set(values).size;
      const spread = Math.max(...values) - Math.min(...values);
      const accumulator = accumulators.get(metric)!;
      accumulator.maxDistinct = Math.max(accumulator.maxDistinct, distinct);
      accumulator.maxSpread = Math.max(accumulator.maxSpread, spread);
      if (distinct > 1) {
        accumulator.varying += 1;
        familySplit = true;
      }
    }
    if (familySplit) splitByAny += 1;
  }

  const familyCount = repeatedFamilies.length;
  const discriminants = METRICS.map((metric) => {
    const accumulator = accumulators.get(metric)!;
    return {
      metric,
      repeatedQualityFamilies: familyCount,
      varyingQualityFamilies: accumulator.varying,
      discriminationRate: familyCount === 0 ? 0 : accumulator.varying / familyCount,
      maxDistinctValuesInFamily: familyCount === 0 ? 0 : accumulator.maxDistinct,
      maxSpread: accumulator.maxSpread,
    } satisfies MorphologyDiscriminant;
  }).sort((left, right) => {
    if (right.varyingQualityFamilies !== left.varyingQualityFamilies) {
      return right.varyingQualityFamilies - left.varyingQualityFamilies;
    }
    if (right.maxDistinctValuesInFamily !== left.maxDistinctValuesInFamily) {
      return right.maxDistinctValuesInFamily - left.maxDistinctValuesInFamily;
    }
    return left.metric.localeCompare(right.metric);
  });

  return {
    repeatedQualityFamilyCount: familyCount,
    repeatedQualityFamiliesSplitByAnyMorphologyMetric: splitByAny,
    discriminants,
  };
}

export function analyzeParetoMorphologyDiscriminants<T extends MorphologyBearingSolution>(
  solutions: readonly T[],
): MorphologyDiscriminantAnalysis {
  return analyzeMorphologyObservations(
    solutions.map((solution) => ({
      quality: solution.quality,
      morphology: measureGridMorphology(solution.grid),
    })),
  );
}
