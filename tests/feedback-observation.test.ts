import { describe, expect, it } from 'vitest';
import { observeSolveFeedback } from '../src/artifacts/feedback-observation';
import { SOLVE_FEEDBACK_SCHEMA, type SolveFeedback } from '../src/artifacts/solve-feedback';

const feedback = (overrides: Partial<SolveFeedback> = {}): SolveFeedback => ({
  schema: SOLVE_FEEDBACK_SCHEMA,
  crosswordId: 'crossword-001',
  solved: true,
  checks: 0,
  elapsedMs: 120_000,
  difficulty: 3,
  enjoyment: 4,
  ...overrides,
});

describe('FeedbackObservation', () => {
  it('structures factual signals without creating an editorial decision', () => {
    const artifact = observeSolveFeedback({
      id: 'observation-001',
      sourceFeedbackId: 'feedback-001',
      feedback: feedback({ solved: false, checks: 8, difficulty: 5, enjoyment: 2, note: 'Indice CHAT obscur' }),
      createdAt: '2026-08-07T16:00:00Z',
    });

    expect(artifact.crosswordId).toBe('crossword-001');
    expect(artifact.sourceFeedbackId).toBe('feedback-001');
    expect(artifact.observations.map(({ kind }) => kind)).toEqual([
      'unsolved', 'many-checks', 'high-difficulty', 'low-enjoyment', 'player-note',
    ]);
    expect(artifact.observations.at(-1)?.value).toBe('Indice CHAT obscur');
    expect(artifact).not.toHaveProperty('decisions');
    expect(artifact).not.toHaveProperty('locks');
  });

  it('can produce an empty observation set for an unremarkable solve', () => {
    const artifact = observeSolveFeedback({ id: 'observation-002', sourceFeedbackId: 'feedback-002', feedback: feedback() });
    expect(artifact.observations).toEqual([]);
  });

  it('keeps the many-checks threshold explicit and configurable', () => {
    const artifact = observeSolveFeedback({
      id: 'observation-003',
      sourceFeedbackId: 'feedback-003',
      feedback: feedback({ checks: 3 }),
      manyChecksThreshold: 3,
    });
    expect(artifact.observations).toContainEqual({
      kind: 'many-checks', message: 'le joueur a utilisé de nombreuses vérifications', value: 3,
    });
  });
});
