export const SOLVE_FEEDBACK_SCHEMA = 'cruciverbalis.solve-feedback.v1' as const;

export type SolveDifficultyRating = 1 | 2 | 3 | 4 | 5;
export type SolveEnjoymentRating = 1 | 2 | 3 | 4 | 5;

export interface SolveFeedback {
  readonly schema: typeof SOLVE_FEEDBACK_SCHEMA;
  readonly crosswordId: string;
  readonly solved: boolean;
  readonly checks: number;
  readonly elapsedMs: number;
  readonly difficulty?: SolveDifficultyRating;
  readonly enjoyment?: SolveEnjoymentRating;
  readonly note?: string;
}

export interface SolveFeedbackIssue { readonly path: string; readonly message: string; }
export type SolveFeedbackValidationResult =
  | { readonly ok: true; readonly value: SolveFeedback }
  | { readonly ok: false; readonly issues: readonly SolveFeedbackIssue[] };

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const rating = (value: unknown): SolveDifficultyRating | SolveEnjoymentRating | undefined =>
  Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 5 ? Number(value) as SolveDifficultyRating : undefined;

export function validateSolveFeedback(value: unknown): SolveFeedbackValidationResult {
  if (!isRecord(value)) return { ok: false, issues: [{ path: '$', message: 'must be an object' }] };
  const issues: SolveFeedbackIssue[] = [];
  if (value.schema !== SOLVE_FEEDBACK_SCHEMA) issues.push({ path: '$.schema', message: `must equal ${SOLVE_FEEDBACK_SCHEMA}` });
  const crosswordId = typeof value.crosswordId === 'string' && value.crosswordId.trim() ? value.crosswordId.trim() : undefined;
  if (!crosswordId) issues.push({ path: '$.crosswordId', message: 'must be a non-empty string' });
  if (typeof value.solved !== 'boolean') issues.push({ path: '$.solved', message: 'must be a boolean' });
  const checks = Number.isInteger(value.checks) && Number(value.checks) >= 0 ? Number(value.checks) : undefined;
  if (checks === undefined) issues.push({ path: '$.checks', message: 'must be a non-negative integer' });
  const elapsedMs = Number.isFinite(value.elapsedMs) && Number(value.elapsedMs) >= 0 ? Number(value.elapsedMs) : undefined;
  if (elapsedMs === undefined) issues.push({ path: '$.elapsedMs', message: 'must be a non-negative number' });
  const difficulty = value.difficulty === undefined ? undefined : rating(value.difficulty);
  if (value.difficulty !== undefined && difficulty === undefined) issues.push({ path: '$.difficulty', message: 'must be an integer from 1 to 5' });
  const enjoyment = value.enjoyment === undefined ? undefined : rating(value.enjoyment);
  if (value.enjoyment !== undefined && enjoyment === undefined) issues.push({ path: '$.enjoyment', message: 'must be an integer from 1 to 5' });
  const note = value.note === undefined ? undefined : typeof value.note === 'string' ? value.note.trim() : undefined;
  if (value.note !== undefined && note === undefined) issues.push({ path: '$.note', message: 'must be a string' });
  if (issues.length) return { ok: false, issues };
  return { ok: true, value: { schema: SOLVE_FEEDBACK_SCHEMA, crosswordId: crosswordId!, solved: value.solved as boolean, checks: checks!, elapsedMs: elapsedMs!, difficulty, enjoyment, note: note || undefined } };
}

export function serializeSolveFeedback(feedback: SolveFeedback): string { return `${JSON.stringify(feedback, null, 2)}\n`; }
export function parseSolveFeedbackJson(json: string): SolveFeedbackValidationResult {
  try { return validateSolveFeedback(JSON.parse(json)); }
  catch (error) { return { ok: false, issues: [{ path: '$', message: error instanceof Error ? error.message : 'invalid JSON' }] }; }
}
