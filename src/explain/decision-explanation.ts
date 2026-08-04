import type { GridQuality } from '../quality/grid-quality';
import type {
  EditorialPolicy,
  EditorialPolicyEvaluation,
  EditorialPolicySolution,
} from '../editorial/editorial-policy';
import { rankByEditorialPolicy } from '../editorial/editorial-policy';

export type QualityMetric = keyof Pick<
  GridQuality,
  'placedEntries' | 'crossings' | 'area' | 'density' | 'directionBalance'
>;

export interface EditorialDecisionExplanation {
  readonly kind: 'editorial';
  readonly policyId: string;
  readonly winnerIndex: number;
  readonly comparedIndex: number;
  readonly decisiveCriterionIndex?: number;
  readonly message: string;
}

export interface ParetoDecisionExplanation {
  readonly kind: 'pareto';
  readonly relation: 'left-dominates' | 'right-dominates' | 'equal' | 'incomparable';
  readonly leftAdvantages: readonly QualityMetric[];
  readonly rightAdvantages: readonly QualityMetric[];
  readonly message: string;
}

const morphologyLabels: Record<string, string> = {
  width: 'largeur',
  height: 'hauteur',
  aspectRatio: 'ratio d’aspect',
  exposedEdges: 'bords exposés',
  leafEntries: 'mots-feuilles',
  maxEntryDegree: 'degré maximal',
  graphDiameter: 'diamètre du graphe',
};

const qualityLabels: Record<QualityMetric, string> = {
  placedEntries: 'mots placés',
  crossings: 'croisements',
  area: 'aire',
  density: 'densité',
  directionBalance: 'équilibre horizontal/vertical',
};

function firstDecisiveCriterion(
  left: EditorialPolicyEvaluation,
  right: EditorialPolicyEvaluation,
): number | undefined {
  for (let index = 0; index < left.criteria.length; index += 1) {
    if (left.criteria[index]?.distance !== right.criteria[index]?.distance) return index;
  }
  return undefined;
}

export function explainEditorialDecision<T extends EditorialPolicySolution>(
  solutions: readonly T[],
  policy: EditorialPolicy,
  winnerIndex = 0,
  comparedIndex = 1,
): EditorialDecisionExplanation | undefined {
  if (solutions.length < 2) return undefined;
  const ranking = rankByEditorialPolicy(solutions, policy);
  const winner = ranking.ranked[winnerIndex];
  const compared = ranking.ranked[comparedIndex];
  if (!winner || !compared) return undefined;

  const decisiveCriterionIndex = firstDecisiveCriterion(winner, compared);
  if (decisiveCriterionIndex === undefined) {
    return {
      kind: 'editorial',
      policyId: policy.id,
      winnerIndex: winner.originalIndex,
      comparedIndex: compared.originalIndex,
      message: `Les deux solutions sont à égalité selon tous les critères de la politique « ${policy.name} ». Leur ordre final conserve donc l’ordre initial.`,
    };
  }

  const criterion = winner.criteria[decisiveCriterionIndex]!;
  const metric = morphologyLabels[criterion.preference.metric] ?? criterion.preference.metric;
  const previous = decisiveCriterionIndex === 0
    ? 'Le premier critère suffit à les départager.'
    : `Les ${decisiveCriterionIndex} critère${decisiveCriterionIndex > 1 ? 's' : ''} précédent${decisiveCriterionIndex > 1 ? 's' : ''} étaient à égalité.`;

  return {
    kind: 'editorial',
    policyId: policy.id,
    winnerIndex: winner.originalIndex,
    comparedIndex: compared.originalIndex,
    decisiveCriterionIndex,
    message: `La solution ${winner.originalIndex + 1} est classée devant la solution ${compared.originalIndex + 1} selon « ${policy.name} » grâce au critère ${metric}. ${previous}`,
  };
}

const qualityDirections: Record<QualityMetric, 'higher' | 'lower'> = {
  placedEntries: 'higher',
  crossings: 'higher',
  area: 'lower',
  density: 'higher',
  directionBalance: 'higher',
};

export function explainParetoRelation(
  left: GridQuality,
  right: GridQuality,
): ParetoDecisionExplanation {
  const metrics = Object.keys(qualityDirections) as QualityMetric[];
  const leftAdvantages: QualityMetric[] = [];
  const rightAdvantages: QualityMetric[] = [];

  for (const metric of metrics) {
    if (left[metric] === right[metric]) continue;
    const direction = qualityDirections[metric];
    const leftBetter = direction === 'higher'
      ? left[metric] > right[metric]
      : left[metric] < right[metric];
    (leftBetter ? leftAdvantages : rightAdvantages).push(metric);
  }

  const relation = leftAdvantages.length === 0 && rightAdvantages.length === 0
    ? 'equal'
    : rightAdvantages.length === 0
      ? 'left-dominates'
      : leftAdvantages.length === 0
        ? 'right-dominates'
        : 'incomparable';

  const names = (values: readonly QualityMetric[]) =>
    values.map((metric) => qualityLabels[metric]).join(', ');

  const message = relation === 'equal'
    ? 'Les deux solutions ont exactement le même profil GridQuality.'
    : relation === 'left-dominates'
      ? `La première solution domine la seconde : elle est meilleure sur ${names(leftAdvantages)} et n’est moins bonne sur aucun critère.`
      : relation === 'right-dominates'
        ? `La seconde solution domine la première : elle est meilleure sur ${names(rightAdvantages)} et n’est moins bonne sur aucun critère.`
        : `Les solutions sont Pareto-incomparables : la première est meilleure sur ${names(leftAdvantages)}, tandis que la seconde est meilleure sur ${names(rightAdvantages)}.`;

  return { kind: 'pareto', relation, leftAdvantages, rightAdvantages, message };
}
