import type { SolveFeedback } from './solve-feedback';

export const FEEDBACK_OBSERVATION_SCHEMA = 'cruciverbalis.feedback-observation.v1' as const;

export type FeedbackObservationKind =
  | 'unsolved'
  | 'many-checks'
  | 'high-difficulty'
  | 'low-enjoyment'
  | 'player-note';

export interface FeedbackObservation {
  readonly kind: FeedbackObservationKind;
  readonly message: string;
  readonly value?: number | string;
}

export interface FeedbackObservationArtifact {
  readonly schema: typeof FEEDBACK_OBSERVATION_SCHEMA;
  readonly id: string;
  readonly crosswordId: string;
  readonly sourceFeedbackId: string;
  readonly observations: readonly FeedbackObservation[];
  readonly createdAt?: string;
}

export interface ObserveSolveFeedbackOptions {
  readonly id: string;
  readonly sourceFeedbackId: string;
  readonly feedback: SolveFeedback;
  readonly manyChecksThreshold?: number;
  readonly createdAt?: string;
}

/**
 * Transforme un retour joueur en constats factuels et inspectables.
 * Ces constats ne sont ni des décisions éditoriales, ni des contraintes, ni
 * des recommandations automatiques de modification de la grille.
 */
export function observeSolveFeedback(options: ObserveSolveFeedbackOptions): FeedbackObservationArtifact {
  const { feedback } = options;
  const observations: FeedbackObservation[] = [];
  const manyChecksThreshold = options.manyChecksThreshold ?? 5;

  if (!feedback.solved) observations.push({ kind: 'unsolved', message: 'la grille n’a pas été résolue' });
  if (feedback.checks >= manyChecksThreshold) observations.push({ kind: 'many-checks', message: 'le joueur a utilisé de nombreuses vérifications', value: feedback.checks });
  if (feedback.difficulty !== undefined && feedback.difficulty >= 4) observations.push({ kind: 'high-difficulty', message: 'le joueur a évalué la difficulté comme élevée', value: feedback.difficulty });
  if (feedback.enjoyment !== undefined && feedback.enjoyment <= 2) observations.push({ kind: 'low-enjoyment', message: 'le joueur a évalué son plaisir comme faible', value: feedback.enjoyment });
  if (feedback.note) observations.push({ kind: 'player-note', message: 'le joueur a fourni une note libre', value: feedback.note });

  return {
    schema: FEEDBACK_OBSERVATION_SCHEMA,
    id: options.id,
    crosswordId: feedback.crosswordId,
    sourceFeedbackId: options.sourceFeedbackId,
    observations,
    createdAt: options.createdAt,
  };
}

export function serializeFeedbackObservation(artifact: FeedbackObservationArtifact): string {
  return `${JSON.stringify(artifact, null, 2)}\n`;
}
