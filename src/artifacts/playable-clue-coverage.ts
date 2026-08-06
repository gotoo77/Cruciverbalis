import { normalizeAnswer } from '../core/normalize';
import type { ClueSet } from './clue-set';
import type { PlayableCrossword } from './playable-crossword';

export interface PlayableClueCoverage {
  readonly totalAnswers: number;
  readonly coveredAnswers: number;
  readonly missingAnswers: readonly string[];
  readonly coverage: number;
  readonly complete: boolean;
}

/** Mesure la couverture éditoriale de toutes les réponses réellement présentes dans une grille finale. */
export function analyzePlayableClueCoverage(
  crossword: PlayableCrossword,
  clueSet: ClueSet,
): PlayableClueCoverage {
  const covered = new Set(clueSet.clues.map(({ answer }) => normalizeAnswer(answer)));
  const answers = crossword.entries.map(({ answer }) => normalizeAnswer(answer));
  const missingAnswers = answers.filter((answer) => !covered.has(answer));
  const totalAnswers = answers.length;
  const coveredAnswers = totalAnswers - missingAnswers.length;

  return {
    totalAnswers,
    coveredAnswers,
    missingAnswers,
    coverage: totalAnswers === 0 ? 1 : coveredAnswers / totalAnswers,
    complete: missingAnswers.length === 0,
  };
}
