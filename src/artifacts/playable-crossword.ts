import type { Direction, DomainGrid } from '../core/domain';
import {
  CLUE_KINDS,
  cluesForAnswer,
  type Clue,
  type ClueKind,
  type ClueSet,
} from './clue-set';
import type { ArtifactProvenance, WordSet } from './word-set';

export const PLAYABLE_CROSSWORD_SCHEMA = 'cruciverbalis.playable-crossword.v1' as const;

export interface PlayableClue {
  readonly id: string;
  readonly kind: ClueKind;
  readonly text: string;
  readonly difficulty?: number;
}

export interface PlayableEntry {
  readonly id: string;
  readonly answer: string;
  readonly row: number;
  readonly col: number;
  readonly direction: Direction;
  readonly clue: PlayableClue;
}

export interface PlayableCrossword {
  readonly schema: typeof PLAYABLE_CROSSWORD_SCHEMA;
  readonly id: string;
  readonly name: string;
  readonly language: string;
  readonly wordSetId?: string;
  readonly clueSetId: string;
  readonly entries: readonly PlayableEntry[];
  readonly provenance?: ArtifactProvenance;
}

export interface ClueSelection {
  readonly answer: string;
  readonly clueId: string;
}

export interface ComposePlayableCrosswordOptions {
  readonly id: string;
  readonly name: string;
  readonly language?: string;
  readonly wordSetId?: string;
  readonly clueSelections?: readonly ClueSelection[];
  readonly provenance?: ArtifactProvenance;
}

export type ComposePlayableCrosswordFromArtifactsOptions = Omit<
  ComposePlayableCrosswordOptions,
  'wordSetId'
>;

export interface PlayableCrosswordIssue {
  readonly path: string;
  readonly message: string;
}

export type ComposePlayableCrosswordResult =
  | { readonly ok: true; readonly value: PlayableCrossword }
  | { readonly ok: false; readonly issues: readonly PlayableCrosswordIssue[] };

export type PlayableCrosswordValidationResult = ComposePlayableCrosswordResult;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const normalizeAnswer = (answer: string): string =>
  answer.normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().toLocaleUpperCase('fr-FR');

function selectedClue(
  clueSet: ClueSet,
  answer: string,
  selections: ReadonlyMap<string, string>,
): { clue?: Clue; issue?: string } {
  const candidates = cluesForAnswer(clueSet, answer);
  if (candidates.length === 0) return { issue: `no clue found for ${answer}` };

  const selectedId = selections.get(normalizeAnswer(answer));
  if (selectedId) {
    const clue = candidates.find(({ id }) => id === selectedId);
    return clue
      ? { clue }
      : { issue: `selected clue ${selectedId} does not match ${answer}` };
  }

  if (candidates.length === 1) return { clue: candidates[0] };
  return { issue: `several clues exist for ${answer}; an explicit clue selection is required` };
}

/**
 * Compose une grille concrète et choisit exactement un indice éditorial par
 * réponse placée. Le ClueSet n'est jamais utilisé comme source des mots : il
 * annote uniquement les réponses déjà présentes dans la grille.
 */
export function composePlayableCrossword(
  grid: DomainGrid,
  clueSet: ClueSet,
  options: ComposePlayableCrosswordOptions,
): ComposePlayableCrosswordResult {
  const issues: PlayableCrosswordIssue[] = [];
  if (!options.id.trim()) issues.push({ path: '$.id', message: 'must not be empty' });
  if (!options.name.trim()) issues.push({ path: '$.name', message: 'must not be empty' });
  if (grid.placements.length === 0) issues.push({ path: '$.entries', message: 'grid has no placed entries' });

  const selections = new Map<string, string>();
  for (const [index, selection] of (options.clueSelections ?? []).entries()) {
    const answer = normalizeAnswer(selection.answer);
    if (!answer || !selection.clueId.trim()) {
      issues.push({ path: `$.clueSelections[${index}]`, message: 'answer and clueId must not be empty' });
      continue;
    }
    if (selections.has(answer)) {
      issues.push({ path: `$.clueSelections[${index}].answer`, message: `duplicate selection for ${answer}` });
      continue;
    }
    selections.set(answer, selection.clueId);
  }

  const entries: PlayableEntry[] = [];
  grid.placements.forEach((placement, index) => {
    const answer = normalizeAnswer(placement.entry.answer);
    const resolved = selectedClue(clueSet, answer, selections);
    if (!resolved.clue) {
      issues.push({ path: `$.entries[${index}].clue`, message: resolved.issue ?? 'clue resolution failed' });
      return;
    }
    entries.push({
      id: `entry-${index + 1}`,
      answer,
      row: placement.start.row,
      col: placement.start.col,
      direction: placement.direction,
      clue: {
        id: resolved.clue.id,
        kind: resolved.clue.kind,
        text: resolved.clue.text,
        difficulty: resolved.clue.difficulty,
      },
    });
  });

  if (issues.length > 0) return { ok: false, issues };

  return {
    ok: true,
    value: {
      schema: PLAYABLE_CROSSWORD_SCHEMA,
      id: options.id,
      name: options.name,
      language: options.language ?? clueSet.language,
      wordSetId: options.wordSetId,
      clueSetId: clueSet.id,
      entries,
      provenance: options.provenance,
    },
  };
}

/**
 * Variante recommandée pour la composition éditoriale : le WordSet est la
 * source lexicale déclarée et le ClueSet la couche d'annotations. L'identité
 * du WordSet est dérivée de l'artefact plutôt que répétée manuellement.
 *
 * Les mots ajoutés ensuite par FillPass peuvent ne pas appartenir au WordSet :
 * ils restent valides dès lors que le ClueSet fournit un indice. Le WordSet
 * décrit donc le corpus thématique, pas nécessairement la totalité des cases
 * finales de la grille.
 */
export function composePlayableCrosswordFromArtifacts(
  grid: DomainGrid,
  wordSet: WordSet,
  clueSet: ClueSet,
  options: ComposePlayableCrosswordFromArtifactsOptions,
): ComposePlayableCrosswordResult {
  if (wordSet.language !== clueSet.language) {
    return {
      ok: false,
      issues: [{
        path: '$.language',
        message: `word set language ${wordSet.language} does not match clue set language ${clueSet.language}`,
      }],
    };
  }

  return composePlayableCrossword(grid, clueSet, {
    ...options,
    language: options.language ?? wordSet.language,
    wordSetId: wordSet.id,
  });
}

export function validatePlayableCrossword(value: unknown): PlayableCrosswordValidationResult {
  const issues: PlayableCrosswordIssue[] = [];
  if (!isRecord(value)) return { ok: false, issues: [{ path: '$', message: 'must be an object' }] };

  if (value.schema !== PLAYABLE_CROSSWORD_SCHEMA) {
    issues.push({ path: '$.schema', message: `must equal ${PLAYABLE_CROSSWORD_SCHEMA}` });
  }

  for (const key of ['id', 'name', 'language', 'clueSetId'] as const) {
    if (typeof value[key] !== 'string' || !(value[key] as string).trim()) {
      issues.push({ path: `$.${key}`, message: 'must be a non-empty string' });
    }
  }
  if (value.wordSetId !== undefined && (typeof value.wordSetId !== 'string' || !value.wordSetId.trim())) {
    issues.push({ path: '$.wordSetId', message: 'must be a non-empty string' });
  }

  const entries: PlayableEntry[] = [];
  if (!Array.isArray(value.entries) || value.entries.length === 0) {
    issues.push({ path: '$.entries', message: 'must be a non-empty array' });
  } else {
    const ids = new Set<string>();
    value.entries.forEach((entry, index) => {
      const path = `$.entries[${index}]`;
      if (!isRecord(entry)) {
        issues.push({ path, message: 'must be an object' });
        return;
      }
      const id = typeof entry.id === 'string' && entry.id.trim() ? entry.id : undefined;
      const answer = typeof entry.answer === 'string' && entry.answer.trim() ? normalizeAnswer(entry.answer) : undefined;
      const row = Number.isInteger(entry.row) ? Number(entry.row) : undefined;
      const col = Number.isInteger(entry.col) ? Number(entry.col) : undefined;
      const direction = entry.direction === 'across' || entry.direction === 'down' ? entry.direction : undefined;
      if (!id) issues.push({ path: `${path}.id`, message: 'must be a non-empty string' });
      else if (ids.has(id)) issues.push({ path: `${path}.id`, message: 'duplicates another entry id' });
      else ids.add(id);
      if (!answer) issues.push({ path: `${path}.answer`, message: 'must be a non-empty string' });
      if (row === undefined) issues.push({ path: `${path}.row`, message: 'must be an integer' });
      if (col === undefined) issues.push({ path: `${path}.col`, message: 'must be an integer' });
      if (!direction) issues.push({ path: `${path}.direction`, message: 'must be across or down' });

      let clue: PlayableClue | undefined;
      if (!isRecord(entry.clue)) {
        issues.push({ path: `${path}.clue`, message: 'must be an object' });
      } else {
        const clueId = typeof entry.clue.id === 'string' && entry.clue.id.trim() ? entry.clue.id : undefined;
        const text = typeof entry.clue.text === 'string' && entry.clue.text.trim() ? entry.clue.text : undefined;
        const kind = typeof entry.clue.kind === 'string' && (CLUE_KINDS as readonly string[]).includes(entry.clue.kind)
          ? entry.clue.kind as ClueKind
          : undefined;
        const difficulty = entry.clue.difficulty === undefined
          ? undefined
          : Number.isInteger(entry.clue.difficulty) && Number(entry.clue.difficulty) >= 1 && Number(entry.clue.difficulty) <= 5
            ? Number(entry.clue.difficulty)
            : null;
        if (!clueId) issues.push({ path: `${path}.clue.id`, message: 'must be a non-empty string' });
        if (!text) issues.push({ path: `${path}.clue.text`, message: 'must be a non-empty string' });
        if (!kind) issues.push({ path: `${path}.clue.kind`, message: `must be one of: ${CLUE_KINDS.join(', ')}` });
        if (difficulty === null) issues.push({ path: `${path}.clue.difficulty`, message: 'must be an integer from 1 to 5' });
        if (clueId && text && kind && difficulty !== null) clue = { id: clueId, text, kind, difficulty };
      }

      if (id && answer && row !== undefined && col !== undefined && direction && clue) {
        entries.push({ id, answer, row, col, direction, clue });
      }
    });
  }

  if (issues.length > 0) return { ok: false, issues };
  return {
    ok: true,
    value: {
      schema: PLAYABLE_CROSSWORD_SCHEMA,
      id: value.id as string,
      name: value.name as string,
      language: value.language as string,
      wordSetId: value.wordSetId as string | undefined,
      clueSetId: value.clueSetId as string,
      entries,
      provenance: value.provenance as ArtifactProvenance | undefined,
    },
  };
}

export function parsePlayableCrosswordJson(json: string): PlayableCrosswordValidationResult {
  try {
    return validatePlayableCrossword(JSON.parse(json));
  } catch (error) {
    return {
      ok: false,
      issues: [{ path: '$', message: error instanceof Error ? error.message : 'invalid JSON' }],
    };
  }
}

export function serializePlayableCrossword(crossword: PlayableCrossword): string {
  return `${JSON.stringify(crossword, null, 2)}\n`;
}
