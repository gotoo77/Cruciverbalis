import type { DomainGrid } from '../core/domain';
import { measureGridMorphology, type GridMorphology } from '../quality/grid-morphology';
import type { MorphologyMetric } from '../quality/morphology-discriminants';
import type { QualityBearingSolution } from '../quality/pareto-analysis';

export type EditorialPreference =
  | { readonly metric: MorphologyMetric; readonly prefer: 'lower' | 'higher' }
  | { readonly metric: MorphologyMetric; readonly prefer: 'target'; readonly target: number };

/**
 * A versioned and explicit editorial point of view.
 *
 * Preference order is significant: policies compare solutions
 * lexicographically instead of hiding trade-offs in an arbitrary weighted sum.
 */
export interface EditorialPolicy {
  readonly schema: 'cruciverbalis.editorial-policy.v1';
  readonly id: string;
  readonly name: string;
  readonly version: number;
  readonly description: string;
  readonly preferences: readonly EditorialPreference[];
}

export interface EditorialPolicySolution extends QualityBearingSolution {
  readonly grid: DomainGrid;
}

export interface EditorialCriterionEvaluation {
  readonly preference: EditorialPreference;
  readonly value: number;
  readonly distance: number;
}

export interface EditorialPolicyEvaluation<T extends EditorialPolicySolution = EditorialPolicySolution> {
  readonly solution: T;
  readonly originalIndex: number;
  readonly criteria: readonly EditorialCriterionEvaluation[];
}

export interface EditorialPolicyRanking<T extends EditorialPolicySolution = EditorialPolicySolution> {
  readonly policy: EditorialPolicy;
  readonly ranked: readonly EditorialPolicyEvaluation<T>[];
  readonly tieGroupCount: number;
}

function validatePolicy(policy: EditorialPolicy): void {
  if (policy.schema !== 'cruciverbalis.editorial-policy.v1') {
    throw new Error(`unsupported editorial policy schema: ${policy.schema}`);
  }
  if (!policy.id.trim()) throw new Error('editorial policy id must not be empty');
  if (!Number.isInteger(policy.version) || policy.version < 1) {
    throw new Error('editorial policy version must be a positive integer');
  }

  const seen = new Set<MorphologyMetric>();
  for (const preference of policy.preferences) {
    if (seen.has(preference.metric)) {
      throw new Error(`duplicate editorial preference: ${preference.metric}`);
    }
    seen.add(preference.metric);
    if (preference.prefer === 'target' && !Number.isFinite(preference.target)) {
      throw new Error(`invalid target for ${preference.metric}`);
    }
  }
}

function preferenceDistance(value: number, preference: EditorialPreference): number {
  switch (preference.prefer) {
    case 'lower':
      return value;
    case 'higher':
      return -value;
    case 'target':
      return Math.abs(value - preference.target);
  }
}

function criterion(
  morphology: GridMorphology,
  preference: EditorialPreference,
): EditorialCriterionEvaluation {
  const value = morphology[preference.metric];
  return { preference, value, distance: preferenceDistance(value, preference) };
}

function compareEvaluations(
  left: EditorialPolicyEvaluation,
  right: EditorialPolicyEvaluation,
): number {
  for (let index = 0; index < left.criteria.length; index += 1) {
    const leftCriterion = left.criteria[index];
    const rightCriterion = right.criteria[index];
    if (!leftCriterion || !rightCriterion) continue;
    if (leftCriterion.distance !== rightCriterion.distance) {
      return leftCriterion.distance - rightCriterion.distance;
    }
  }
  return left.originalIndex - right.originalIndex;
}

function sameEditorialPosition(
  left: EditorialPolicyEvaluation,
  right: EditorialPolicyEvaluation,
): boolean {
  return left.criteria.every(
    (criterion, index) => criterion.distance === right.criteria[index]?.distance,
  );
}

/**
 * Applies an editorial policy after generation. It never mutates GridQuality,
 * Pareto dominance, search order, equivalence, or pruning.
 */
export function rankByEditorialPolicy<T extends EditorialPolicySolution>(
  solutions: readonly T[],
  policy: EditorialPolicy,
): EditorialPolicyRanking<T> {
  validatePolicy(policy);

  const ranked = solutions
    .map((solution, originalIndex) => {
      const morphology = measureGridMorphology(solution.grid);
      return {
        solution,
        originalIndex,
        criteria: policy.preferences.map((preference) => criterion(morphology, preference)),
      } satisfies EditorialPolicyEvaluation<T>;
    })
    .sort(compareEvaluations) as EditorialPolicyEvaluation<T>[];

  let tieGroupCount = 0;
  for (let index = 0; index < ranked.length; index += 1) {
    if (index === 0 || !sameEditorialPosition(ranked[index - 1]!, ranked[index]!)) {
      tieGroupCount += 1;
    }
  }

  return { policy, ranked, tieGroupCount };
}

export const EDITORIAL_POLICIES = {
  balanced: {
    schema: 'cruciverbalis.editorial-policy.v1',
    id: 'balanced',
    name: 'Équilibrée',
    version: 1,
    description: 'Préfère une silhouette proche du carré, puis un graphe de croisements court et peu de mots-feuilles.',
    preferences: [
      { metric: 'aspectRatio', prefer: 'target', target: 1 },
      { metric: 'graphDiameter', prefer: 'lower' },
      { metric: 'leafEntries', prefer: 'lower' },
    ],
  },
  compactNetwork: {
    schema: 'cruciverbalis.editorial-policy.v1',
    id: 'compact-network',
    name: 'Réseau compact',
    version: 1,
    description: 'Préfère d’abord un diamètre faible, puis peu de feuilles et une faible exposition de la silhouette.',
    preferences: [
      { metric: 'graphDiameter', prefer: 'lower' },
      { metric: 'leafEntries', prefer: 'lower' },
      { metric: 'exposedEdges', prefer: 'lower' },
    ],
  },
  exploratory: {
    schema: 'cruciverbalis.editorial-policy.v1',
    id: 'exploratory',
    name: 'Exploratoire',
    version: 1,
    description: 'Préfère les structures ramifiées et étendues afin de montrer des formes inhabituelles.',
    preferences: [
      { metric: 'graphDiameter', prefer: 'higher' },
      { metric: 'leafEntries', prefer: 'higher' },
      { metric: 'aspectRatio', prefer: 'higher' },
    ],
  },
} as const satisfies Record<string, EditorialPolicy>;
