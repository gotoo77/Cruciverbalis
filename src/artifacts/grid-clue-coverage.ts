import type { DomainGrid } from '../core/domain';
import { normalizeAnswer } from '../core/normalize';
import type { ClueSet } from './clue-set';

export interface GridClueCoverage {
  readonly totalAnswers: number;
  readonly coveredAnswers: number;
  readonly missingAnswers: readonly string[];
  readonly coverage: number;
  readonly complete: boolean;
}

/** Mesure la couverture éditoriale d'une grille solution avant création du PlayableCrossword. */
export function analyzeGridClueCoverage(grid: DomainGrid, clueSet: ClueSet): GridClueCoverage {
  const covered = new Set(clueSet.clues.map(({ answer }) => normalizeAnswer(answer)));
  const answers = grid.placements.map(({ entry }) => normalizeAnswer(entry.answer));
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
