import { normalizeAnswer } from '../core/normalize';
import type { PlayableCrossword, PlayableEntry } from './playable-crossword';
import type { WordSet } from './word-set';

export type PlayableEntryRole = 'thematic' | 'fill';

export interface ClassifiedPlayableEntry {
  readonly entry: PlayableEntry;
  readonly role: PlayableEntryRole;
}

export interface PlayableEntryRoleSummary {
  readonly entries: readonly ClassifiedPlayableEntry[];
  readonly thematicCount: number;
  readonly fillCount: number;
  readonly thematicAnswers: readonly string[];
  readonly fillAnswers: readonly string[];
}

/**
 * Classe les entrées d'une grille jouable selon leur origine éditoriale.
 *
 * Le WordSet décrit le corpus thématique choisi pour la génération. Toute
 * réponse finale qui n'appartient pas à ce corpus est considérée comme du
 * remplissage, typiquement ajoutée par FillPass. Le ClueSet n'intervient pas
 * dans cette classification : il annote les réponses, il ne décide pas de
 * leur rôle lexical.
 */
export function classifyPlayableEntries(
  crossword: PlayableCrossword,
  wordSet: WordSet,
): PlayableEntryRoleSummary {
  const thematicAnswersSet = new Set(
    wordSet.entries.map(({ answer }) => normalizeAnswer(answer)),
  );

  const entries = crossword.entries.map((entry) => ({
    entry,
    role: thematicAnswersSet.has(normalizeAnswer(entry.answer))
      ? 'thematic' as const
      : 'fill' as const,
  }));

  const thematicAnswers = entries
    .filter(({ role }) => role === 'thematic')
    .map(({ entry }) => normalizeAnswer(entry.answer));
  const fillAnswers = entries
    .filter(({ role }) => role === 'fill')
    .map(({ entry }) => normalizeAnswer(entry.answer));

  return {
    entries,
    thematicCount: thematicAnswers.length,
    fillCount: fillAnswers.length,
    thematicAnswers,
    fillAnswers,
  };
}
