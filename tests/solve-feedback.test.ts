import { describe, expect, it } from 'vitest';
import { parseSolveFeedbackJson, serializeSolveFeedback, SOLVE_FEEDBACK_SCHEMA, validateSolveFeedback, type SolveFeedback } from '../src/api';

const fixture: SolveFeedback = {
  schema: SOLVE_FEEDBACK_SCHEMA,
  crosswordId: 'demo-v1',
  solved: true,
  checks: 2,
  elapsedMs: 42_500,
  difficulty: 3,
  enjoyment: 5,
  note: 'Bonne progression.',
};

describe('SolveFeedback v1', () => {
  it('accepts a complete solve observation', () => {
    const result = validateSolveFeedback(fixture);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.crosswordId).toBe('demo-v1');
    expect(result.value.solved).toBe(true);
  });

  it('round-trips through JSON serialization', () => {
    const parsed = parseSolveFeedbackJson(serializeSolveFeedback(fixture));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value).toEqual(fixture);
  });

  it('rejects invalid ratings and counters', () => {
    const result = validateSolveFeedback({ ...fixture, checks: -1, elapsedMs: -5, difficulty: 6 });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.map(({ path }) => path)).toContain('$.checks');
    expect(result.issues.map(({ path }) => path)).toContain('$.elapsedMs');
    expect(result.issues.map(({ path }) => path)).toContain('$.difficulty');
  });
});
