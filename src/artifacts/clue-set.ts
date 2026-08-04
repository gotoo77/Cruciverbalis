import type { ArtifactProvenance } from './word-set';

export const CLUE_SET_SCHEMA = 'cruciverbalis.clue-set.v1' as const;

export const CLUE_KINDS = [
  'definition',
  'synonym',
  'analogy',
  'wordplay',
  'historical',
  'quote',
  'phonetic',
  'cryptic',
  'etymology',
] as const;

export type ClueKind = (typeof CLUE_KINDS)[number];

export interface Clue {
  readonly id: string;
  readonly answer: string;
  readonly kind: ClueKind;
  readonly text: string;
  readonly difficulty?: number;
  readonly source?: string;
  readonly confidence?: number;
  readonly tags?: readonly string[];
}

export interface ClueSet {
  readonly schema: typeof CLUE_SET_SCHEMA;
  readonly id: string;
  readonly name: string;
  readonly language: string;
  readonly description?: string;
  readonly license?: string;
  readonly author?: string;
  readonly clues: readonly Clue[];
  readonly provenance?: ArtifactProvenance;
}

export interface ClueSetValidationIssue {
  readonly path: string;
  readonly message: string;
}

export interface ClueSetValidationSuccess {
  readonly ok: true;
  readonly value: ClueSet;
}

export interface ClueSetValidationFailure {
  readonly ok: false;
  readonly issues: readonly ClueSetValidationIssue[];
}

export type ClueSetValidationResult = ClueSetValidationSuccess | ClueSetValidationFailure;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const optionalString = (
  record: Record<string, unknown>,
  key: string,
  path: string,
  issues: ClueSetValidationIssue[],
): string | undefined => {
  const value = record[key];
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || value.trim().length === 0) {
    issues.push({ path: `${path}.${key}`, message: 'must be a non-empty string' });
    return undefined;
  }
  return value;
};

const requiredString = (
  record: Record<string, unknown>,
  key: string,
  path: string,
  issues: ClueSetValidationIssue[],
): string | undefined => {
  const value = optionalString(record, key, path, issues);
  if (value === undefined && record[key] === undefined) {
    issues.push({ path: `${path}.${key}`, message: 'is required' });
  }
  return value;
};

const normalizeAnswer = (answer: string): string =>
  answer.normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().toLocaleUpperCase('fr-FR');

export function validateClueSet(value: unknown): ClueSetValidationResult {
  const issues: ClueSetValidationIssue[] = [];
  if (!isRecord(value)) {
    return { ok: false, issues: [{ path: '$', message: 'must be an object' }] };
  }

  if (value.schema !== CLUE_SET_SCHEMA) {
    issues.push({ path: '$.schema', message: `must equal ${CLUE_SET_SCHEMA}` });
  }

  const id = requiredString(value, 'id', '$', issues);
  const name = requiredString(value, 'name', '$', issues);
  const language = requiredString(value, 'language', '$', issues);
  const description = optionalString(value, 'description', '$', issues);
  const license = optionalString(value, 'license', '$', issues);
  const author = optionalString(value, 'author', '$', issues);

  const clueIds = new Set<string>();
  const clues: Clue[] = [];
  if (!Array.isArray(value.clues) || value.clues.length === 0) {
    issues.push({ path: '$.clues', message: 'must be a non-empty array' });
  } else {
    value.clues.forEach((candidate, index) => {
      const path = `$.clues[${index}]`;
      if (!isRecord(candidate)) {
        issues.push({ path, message: 'must be an object' });
        return;
      }

      const clueId = requiredString(candidate, 'id', path, issues);
      const answer = requiredString(candidate, 'answer', path, issues);
      const text = requiredString(candidate, 'text', path, issues);
      const source = optionalString(candidate, 'source', path, issues);

      const kindValue = candidate.kind;
      const kind = typeof kindValue === 'string' && (CLUE_KINDS as readonly string[]).includes(kindValue)
        ? kindValue as ClueKind
        : undefined;
      if (!kind) issues.push({ path: `${path}.kind`, message: `must be one of: ${CLUE_KINDS.join(', ')}` });

      let difficulty: number | undefined;
      if (candidate.difficulty !== undefined) {
        if (!Number.isInteger(candidate.difficulty) || Number(candidate.difficulty) < 1 || Number(candidate.difficulty) > 5) {
          issues.push({ path: `${path}.difficulty`, message: 'must be an integer from 1 to 5' });
        } else {
          difficulty = Number(candidate.difficulty);
        }
      }

      let confidence: number | undefined;
      if (candidate.confidence !== undefined) {
        if (typeof candidate.confidence !== 'number' || !Number.isFinite(candidate.confidence) || candidate.confidence < 0 || candidate.confidence > 1) {
          issues.push({ path: `${path}.confidence`, message: 'must be a finite number from 0 to 1' });
        } else {
          confidence = candidate.confidence;
        }
      }

      let tags: readonly string[] | undefined;
      if (candidate.tags !== undefined) {
        if (!Array.isArray(candidate.tags) || candidate.tags.some((tag) => typeof tag !== 'string' || tag.trim().length === 0)) {
          issues.push({ path: `${path}.tags`, message: 'must be an array of non-empty strings' });
        } else {
          tags = candidate.tags;
        }
      }

      if (clueId) {
        if (clueIds.has(clueId)) {
          issues.push({ path: `${path}.id`, message: 'duplicates another clue id' });
        }
        clueIds.add(clueId);
      }

      if (clueId && answer && text && kind) {
        clues.push({ id: clueId, answer: normalizeAnswer(answer), kind, text, difficulty, source, confidence, tags });
      }
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
        if (!Array.isArray(parentsValue) || parentsValue.some((parent) => typeof parent !== 'string' || parent.trim().length === 0)) {
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
      schema: CLUE_SET_SCHEMA,
      id,
      name,
      language,
      description,
      license,
      author,
      clues,
      provenance,
    },
  };
}

export function parseClueSetJson(json: string): ClueSetValidationResult {
  try {
    return validateClueSet(JSON.parse(json));
  } catch (error) {
    return {
      ok: false,
      issues: [{ path: '$', message: error instanceof Error ? error.message : 'invalid JSON' }],
    };
  }
}

export function serializeClueSet(clueSet: ClueSet): string {
  return `${JSON.stringify(clueSet, null, 2)}\n`;
}

export function cluesForAnswer(clueSet: ClueSet, answer: string): readonly Clue[] {
  const normalized = normalizeAnswer(answer);
  return clueSet.clues.filter((clue) => normalizeAnswer(clue.answer) === normalized);
}
