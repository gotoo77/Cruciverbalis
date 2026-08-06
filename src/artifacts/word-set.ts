import type { Entry } from '../core/domain';

export const WORD_SET_SCHEMA = 'cruciverbalis.word-set.v1' as const;

export interface ArtifactProvenance {
  readonly createdBy?: string;
  readonly source?: string;
  readonly createdAt?: string;
  readonly parentArtifacts?: readonly string[];
}

/**
 * Une entrée de WordSet décrit uniquement le matériau lexical de génération.
 * Les contenus destinés au joueur (définition, indice, jeu de mots, etc.)
 * appartiennent aux ClueSet et ne doivent pas être dupliqués ici.
 */
export interface WordSetEntry {
  readonly answer: string;
  readonly theme?: string;
  readonly difficulty?: number;
}

export interface WordSet {
  readonly schema: typeof WORD_SET_SCHEMA;
  readonly id: string;
  readonly name: string;
  readonly language: string;
  readonly description?: string;
  readonly license?: string;
  readonly author?: string;
  readonly entries: readonly WordSetEntry[];
  readonly provenance?: ArtifactProvenance;
}

export interface WordSetValidationIssue {
  readonly path: string;
  readonly message: string;
}

export interface WordSetValidationSuccess {
  readonly ok: true;
  readonly value: WordSet;
}

export interface WordSetValidationFailure {
  readonly ok: false;
  readonly issues: readonly WordSetValidationIssue[];
}

export type WordSetValidationResult = WordSetValidationSuccess | WordSetValidationFailure;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const optionalString = (
  record: Record<string, unknown>,
  key: string,
  path: string,
  issues: WordSetValidationIssue[],
): string | undefined => {
  const value = record[key];
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || value.trim().length === 0) {
    issues.push({ path: `${path}.${key}`, message: 'must be a non-empty string' });
    return undefined;
  }
  return value;
};

const WORD_SET_ENTRY_KEYS = new Set(['answer', 'theme', 'difficulty']);

export function validateWordSet(value: unknown): WordSetValidationResult {
  const issues: WordSetValidationIssue[] = [];
  if (!isRecord(value)) {
    return { ok: false, issues: [{ path: '$', message: 'must be an object' }] };
  }

  if (value.schema !== WORD_SET_SCHEMA) {
    issues.push({ path: '$.schema', message: `must equal ${WORD_SET_SCHEMA}` });
  }

  const id = optionalString(value, 'id', '$', issues);
  const name = optionalString(value, 'name', '$', issues);
  const language = optionalString(value, 'language', '$', issues);
  const description = optionalString(value, 'description', '$', issues);
  const license = optionalString(value, 'license', '$', issues);
  const author = optionalString(value, 'author', '$', issues);

  const entriesValue = value.entries;
  const entries: WordSetEntry[] = [];
  if (!Array.isArray(entriesValue) || entriesValue.length === 0) {
    issues.push({ path: '$.entries', message: 'must be a non-empty array' });
  } else {
    const normalizedAnswers = new Set<string>();
    entriesValue.forEach((candidate, index) => {
      const path = `$.entries[${index}]`;
      if (!isRecord(candidate)) {
        issues.push({ path, message: 'must be an object' });
        return;
      }

      // Le schéma v1 est volontairement fermé au niveau des entrées : cela
      // empêche qu'une définition ou un indice joueur se glisse à nouveau dans
      // WordSet et recrée une seconde source éditoriale à côté de ClueSet.
      for (const key of Object.keys(candidate)) {
        if (!WORD_SET_ENTRY_KEYS.has(key)) {
          issues.push({
            path: `${path}.${key}`,
            message: 'is not allowed in WordSet entries; player-facing content belongs in ClueSet',
          });
        }
      }

      const answer = optionalString(candidate, 'answer', path, issues);
      const theme = optionalString(candidate, 'theme', path, issues);
      const difficultyValue = candidate.difficulty;
      let difficulty: number | undefined;
      if (difficultyValue !== undefined) {
        if (!Number.isInteger(difficultyValue) || Number(difficultyValue) < 1 || Number(difficultyValue) > 5) {
          issues.push({ path: `${path}.difficulty`, message: 'must be an integer from 1 to 5' });
        } else {
          difficulty = Number(difficultyValue);
        }
      }

      if (!answer) return;
      const normalized = answer.trim().toLocaleUpperCase('fr-FR');
      if (normalizedAnswers.has(normalized)) {
        issues.push({ path: `${path}.answer`, message: 'duplicates another answer after normalization' });
        return;
      }
      normalizedAnswers.add(normalized);
      entries.push({ answer, theme, difficulty });
    });
  }

  let provenance: ArtifactProvenance | undefined;
  if (value.provenance !== undefined) {
    if (!isRecord(value.provenance)) {
      issues.push({ path: '$.provenance', message: 'must be an object' });
    } else {
      const createdBy = optionalString(value.provenance, 'createdBy', '$.provenance', issues);
      const source = optionalString(value.provenance, 'source', '$.provenance', issues);
      const createdAt = optionalString(value.provenance, 'createdAt', '$.provenance', issues);
      const parentsValue = value.provenance.parentArtifacts;
      let parentArtifacts: readonly string[] | undefined;
      if (parentsValue !== undefined) {
        if (!Array.isArray(parentsValue) || parentsValue.some((parent) => typeof parent !== 'string' || parent.length === 0)) {
          issues.push({ path: '$.provenance.parentArtifacts', message: 'must be an array of non-empty strings' });
        } else {
          parentArtifacts = parentsValue;
        }
      }
      provenance = { createdBy, source, createdAt, parentArtifacts };
    }
  }

  if (issues.length > 0 || !id || !name || !language) return { ok: false, issues };

  return {
    ok: true,
    value: {
      schema: WORD_SET_SCHEMA,
      id,
      name,
      language,
      description,
      license,
      author,
      entries,
      provenance,
    },
  };
}

export function parseWordSetJson(json: string): WordSetValidationResult {
  try {
    return validateWordSet(JSON.parse(json));
  } catch (error) {
    return {
      ok: false,
      issues: [{ path: '$', message: error instanceof Error ? error.message : 'invalid JSON' }],
    };
  }
}

export function serializeWordSet(wordSet: WordSet): string {
  return `${JSON.stringify(wordSet, null, 2)}\n`;
}

export function wordSetToEntries(wordSet: WordSet): readonly Entry[] {
  return wordSet.entries.map(({ answer, theme, difficulty }) => ({ answer, theme, difficulty }));
}
