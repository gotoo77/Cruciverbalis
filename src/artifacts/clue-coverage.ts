import { normalizeAnswer } from '../core/normalize';
import type { ClueSet } from './clue-set';
import type { WordSet } from './word-set';

export interface ClueCoverage {
  readonly totalAnswers: number;
  readonly coveredAnswers: number;
  readonly missingAnswers: readonly string[];
  readonly coverage: number;
}

/** Mesure si un ClueSet permet réellement de composer toutes les réponses d'un WordSet. */
export function analyzeClueCoverage(wordSet: WordSet, clueSet: ClueSet): ClueCoverage {
  const covered = new Set(clueSet.clues.map(({ answer }) => normalizeAnswer(answer)));
  const answers = wordSet.entries.map(({ answer }) => normalizeAnswer(answer));
  const missingAnswers = answers.filter((answer) => !covered.has(answer));
  const totalAnswers = answers.length;
  const coveredAnswers = totalAnswers - missingAnswers.length;

  return {
    totalAnswers,
    coveredAnswers,
    missingAnswers,
    coverage: totalAnswers === 0 ? 1 : coveredAnswers / totalAnswers,
  };
}
