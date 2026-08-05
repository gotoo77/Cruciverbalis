import { normalizeAnswer } from '../core/normalize';

export interface LexicalCandidate {
  readonly word: string;
  /** Fréquence ou familiarité normalisée entre 0 et 1. */
  readonly frequency?: number;
  /** Permet d'écarter explicitement une abréviation du remplissage courant. */
  readonly abbreviation?: boolean;
  /** Signale un terme volontairement rare ou spécialisé. */
  readonly rare?: boolean;
}

export interface LexicalQualityPolicy {
  readonly minLength: number;
  readonly rejectAbbreviations: boolean;
  readonly shortWordPenalty: number;
  readonly rareWordPenalty: number;
  readonly frequencyWeight: number;
  readonly lengthWeight: number;
}

export const DEFAULT_LEXICAL_QUALITY_POLICY: LexicalQualityPolicy = {
  minLength: 3,
  rejectAbbreviations: true,
  shortWordPenalty: 35,
  rareWordPenalty: 30,
  frequencyWeight: 50,
  lengthWeight: 4,
};

export interface ScoredLexicalCandidate {
  readonly word: string;
  readonly score: number;
  readonly candidate: LexicalCandidate;
}

export function scoreLexicalCandidate(
  candidate: LexicalCandidate,
  policy: LexicalQualityPolicy = DEFAULT_LEXICAL_QUALITY_POLICY,
): ScoredLexicalCandidate | undefined {
  const word = normalizeAnswer(candidate.word);
  if (word.length < policy.minLength) return undefined;
  if (policy.rejectAbbreviations && candidate.abbreviation) return undefined;

  const frequency = Math.max(0, Math.min(1, candidate.frequency ?? 0.5));
  let score = frequency * policy.frequencyWeight + Math.min(word.length, 10) * policy.lengthWeight;
  if (word.length === policy.minLength) score -= policy.shortWordPenalty;
  if (candidate.rare) score -= policy.rareWordPenalty;

  return { word, score, candidate: { ...candidate, word } };
}

export function normalizeLexicon(dictionary: readonly (string | LexicalCandidate)[]): LexicalCandidate[] {
  const byWord = new Map<string, LexicalCandidate>();
  for (const item of dictionary) {
    const candidate = typeof item === 'string' ? { word: item } : item;
    const word = normalizeAnswer(candidate.word);
    if (!word) continue;
    const normalized = { ...candidate, word };
    const previous = byWord.get(word);
    if (!previous || (normalized.frequency ?? 0.5) > (previous.frequency ?? 0.5)) byWord.set(word, normalized);
  }
  return [...byWord.values()];
}
