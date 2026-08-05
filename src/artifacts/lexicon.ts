import { normalizeAnswer } from '../core/normalize';
import type { ArtifactProvenance } from './word-set';
import type { LexicalCandidate } from '../fill/lexical-quality';

export const LEXICON_SCHEMA = 'cruciverbalis.lexicon.v1' as const;

export interface LexiconEntry extends LexicalCandidate {
  readonly word: string;
}

export interface Lexicon {
  readonly schema: typeof LEXICON_SCHEMA;
  readonly id: string;
  readonly name: string;
  readonly language: string;
  readonly description?: string;
  readonly license?: string;
  readonly source?: string;
  readonly entries: readonly LexiconEntry[];
  readonly provenance?: ArtifactProvenance;
}

export interface LexiconValidationIssue {
  readonly path: string;
  readonly message: string;
}

export type LexiconValidationResult =
  | { readonly ok: true; readonly value: Lexicon }
  | { readonly ok: false; readonly issues: readonly LexiconValidationIssue[] };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function requiredString(
  record: Record<string, unknown>,
  key: string,
  path: string,
  issues: LexiconValidationIssue[],
): string | undefined {
  const value = record[key];
  if (typeof value !== 'string' || !value.trim()) {
    issues.push({ path: `${path}.${key}`, message: 'doit être une chaîne non vide' });
    return undefined;
  }
  return value.trim();
}

function optionalString(
  record: Record<string, unknown>,
  key: string,
  path: string,
  issues: LexiconValidationIssue[],
): string | undefined {
  const value = record[key];
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !value.trim()) {
    issues.push({ path: `${path}.${key}`, message: 'doit être une chaîne non vide' });
    return undefined;
  }
  return value.trim();
}

export function validateLexicon(value: unknown): LexiconValidationResult {
  if (!isRecord(value)) return { ok: false, issues: [{ path: '$', message: 'doit être un objet' }] };
  const issues: LexiconValidationIssue[] = [];
  if (value.schema !== LEXICON_SCHEMA) issues.push({ path: '$.schema', message: `doit être égal à ${LEXICON_SCHEMA}` });

  const id = requiredString(value, 'id', '$', issues);
  const name = requiredString(value, 'name', '$', issues);
  const language = requiredString(value, 'language', '$', issues);
  const description = optionalString(value, 'description', '$', issues);
  const license = optionalString(value, 'license', '$', issues);
  const source = optionalString(value, 'source', '$', issues);

  const entries: LexiconEntry[] = [];
  const seen = new Set<string>();
  if (!Array.isArray(value.entries) || value.entries.length === 0) {
    issues.push({ path: '$.entries', message: 'doit être un tableau non vide' });
  } else {
    value.entries.forEach((raw, index) => {
      const path = `$.entries[${index}]`;
      if (!isRecord(raw)) {
        issues.push({ path, message: 'doit être un objet' });
        return;
      }
      const rawWord = requiredString(raw, 'word', path, issues);
      if (!rawWord) return;
      const word = normalizeAnswer(rawWord);
      if (!word) {
        issues.push({ path: `${path}.word`, message: 'ne contient aucune lettre exploitable' });
        return;
      }
      if (seen.has(word)) {
        issues.push({ path: `${path}.word`, message: 'duplique une autre entrée après normalisation' });
        return;
      }
      seen.add(word);

      let frequency: number | undefined;
      if (raw.frequency !== undefined) {
        if (typeof raw.frequency !== 'number' || !Number.isFinite(raw.frequency) || raw.frequency < 0 || raw.frequency > 1) {
          issues.push({ path: `${path}.frequency`, message: 'doit être un nombre entre 0 et 1' });
        } else frequency = raw.frequency;
      }
      if (raw.abbreviation !== undefined && typeof raw.abbreviation !== 'boolean') issues.push({ path: `${path}.abbreviation`, message: 'doit être un booléen' });
      if (raw.rare !== undefined && typeof raw.rare !== 'boolean') issues.push({ path: `${path}.rare`, message: 'doit être un booléen' });

      entries.push({
        word,
        frequency,
        abbreviation: typeof raw.abbreviation === 'boolean' ? raw.abbreviation : undefined,
        rare: typeof raw.rare === 'boolean' ? raw.rare : undefined,
      });
    });
  }

  if (issues.length > 0 || !id || !name || !language) return { ok: false, issues };
  return { ok: true, value: { schema: LEXICON_SCHEMA, id, name, language, description, license, source, entries, provenance: value.provenance as ArtifactProvenance | undefined } };
}

export function parseLexiconJson(json: string): LexiconValidationResult {
  try { return validateLexicon(JSON.parse(json)); }
  catch (error) { return { ok: false, issues: [{ path: '$', message: error instanceof Error ? error.message : 'JSON invalide' }] }; }
}

export function serializeLexicon(lexicon: Lexicon): string {
  return `${JSON.stringify(lexicon, null, 2)}\n`;
}

export function lexiconToCandidates(lexicon: Lexicon): readonly LexicalCandidate[] {
  return lexicon.entries;
}
