import type { ClueSet } from './clue-set';
import { analyzePlayableClueCoverage } from './playable-clue-coverage';
import type { PlayableCrossword } from './playable-crossword';

export interface PlayablePublicationIssue {
  readonly code: 'clue-set-mismatch' | 'missing-clue';
  readonly message: string;
  readonly answer?: string;
}

export interface PlayablePublicationPreflight {
  readonly publishable: boolean;
  readonly issues: readonly PlayablePublicationIssue[];
}

/** Vérifie les invariants éditoriaux minimaux avant d'exposer une grille au joueur. */
export function preflightPlayablePublication(
  crossword: PlayableCrossword,
  clueSet: ClueSet,
): PlayablePublicationPreflight {
  const issues: PlayablePublicationIssue[] = [];

  if (crossword.clueSetId !== clueSet.id) {
    issues.push({
      code: 'clue-set-mismatch',
      message: `la grille référence ${crossword.clueSetId}, mais le ClueSet fourni est ${clueSet.id}`,
    });
  }

  const coverage = analyzePlayableClueCoverage(crossword, clueSet);
  for (const answer of coverage.missingAnswers) {
    issues.push({
      code: 'missing-clue',
      answer,
      message: `aucun indice éditorial disponible pour ${answer}`,
    });
  }

  return { publishable: issues.length === 0, issues };
}
