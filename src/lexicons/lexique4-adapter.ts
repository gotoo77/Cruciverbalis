import { normalizeAnswer } from '../core/normalize';
import { LEXICON_SCHEMA, type Lexicon, type LexiconEntry } from '../artifacts/lexicon';

export interface Lexique4ImportOptions {
  readonly id?: string;
  readonly name?: string;
  readonly wordColumn?: string;
  readonly frequencyColumn?: string;
  readonly rareBelow?: number;
  readonly minLength?: number;
}

export interface Lexique4ImportIssue {
  readonly row?: number;
  readonly message: string;
}

export type Lexique4ImportResult =
  | { readonly ok: true; readonly value: Lexicon; readonly issues: readonly Lexique4ImportIssue[] }
  | { readonly ok: false; readonly issues: readonly Lexique4ImportIssue[] };

const WORD_COLUMNS = ['1_Mot', 'ortho'];
const FREQUENCY_COLUMNS = ['10_FreqMot', '11_FreqOrtho', '12_FreqLemme', 'freqfilms2', 'freqlivres', 'freqlemfilms2', 'freqlemlivres'];

function parseTsv(tsv: string): { headers: string[]; rows: string[][] } {
  const lines = tsv.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = lines[0]!.split('\t').map((value) => value.trim());
  return { headers, rows: lines.slice(1).map((line) => line.split('\t')) };
}

function finiteNumber(value: string | undefined): number | undefined {
  if (value === undefined || value.trim() === '') return undefined;
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function normalizeFrequency(raw: number | undefined, maxFrequency: number): number | undefined {
  if (raw === undefined) return undefined;
  if (maxFrequency <= 0) return 0;
  return Math.log1p(raw) / Math.log1p(maxFrequency);
}

/**
 * Convertit un export TSV de Lexique en artefact `Lexicon v1`.
 *
 * Lexique 4 utilise actuellement des en-têtes numérotés (`1_Mot`,
 * `10_FreqMot`, ...). Les anciens exports avec `ortho` et les colonnes de
 * fréquence historiques restent acceptés pour compatibilité. Un nom de
 * colonne fourni explicitement dans les options reste prioritaire.
 */
export function importLexique4Tsv(tsv: string, options: Lexique4ImportOptions = {}): Lexique4ImportResult {
  const { headers, rows } = parseTsv(tsv);
  if (headers.length === 0) return { ok: false, issues: [{ message: 'Le TSV est vide.' }] };

  const wordColumn = options.wordColumn ?? WORD_COLUMNS.find((candidate) => headers.includes(candidate));
  if (!wordColumn) {
    return { ok: false, issues: [{ message: `Colonne de mot absente : attendu ${WORD_COLUMNS.join(' ou ')}` }] };
  }
  const wordIndex = headers.indexOf(wordColumn);

  const frequencyColumn = options.frequencyColumn ?? FREQUENCY_COLUMNS.find((candidate) => headers.includes(candidate));
  const frequencyIndex = frequencyColumn ? headers.indexOf(frequencyColumn) : -1;
  const minLength = options.minLength ?? 3;
  const rareBelow = options.rareBelow ?? 1;
  const issues: Lexique4ImportIssue[] = [];

  const parsed = rows.flatMap((row, index) => {
    const rawWord = row[wordIndex]?.trim() ?? '';
    const word = normalizeAnswer(rawWord);
    if (!word || word.length < minLength) return [];
    const rawFrequency = frequencyIndex >= 0 ? finiteNumber(row[frequencyIndex]) : undefined;
    if (frequencyIndex >= 0 && row[frequencyIndex]?.trim() && rawFrequency === undefined) {
      issues.push({ row: index + 2, message: `Fréquence invalide pour ${rawWord}` });
    }
    return [{ word, rawFrequency }];
  });

  const maxFrequency = Math.max(0, ...parsed.map(({ rawFrequency }) => rawFrequency ?? 0));
  const byWord = new Map<string, LexiconEntry>();
  for (const { word, rawFrequency } of parsed) {
    const candidate: LexiconEntry = {
      word,
      frequency: normalizeFrequency(rawFrequency, maxFrequency),
      rare: rawFrequency !== undefined ? rawFrequency < rareBelow : undefined,
    };
    const previous = byWord.get(word);
    if (!previous || (candidate.frequency ?? 0) > (previous.frequency ?? 0)) byWord.set(word, candidate);
  }

  const entries = [...byWord.values()].sort((a, b) => a.word.localeCompare(b.word, 'fr'));
  if (entries.length === 0) return { ok: false, issues: [...issues, { message: 'Aucune entrée lexicale exploitable.' }] };

  return {
    ok: true,
    issues,
    value: {
      schema: LEXICON_SCHEMA,
      id: options.id ?? 'lexique4-fr',
      name: options.name ?? 'Lexique 4 — français',
      language: 'fr',
      description: `Import Lexique (${wordColumn}) avec ${frequencyColumn ?? 'aucune colonne de fréquence'} ; fréquence normalisée logarithmiquement.`,
      license: 'CC BY-SA 4.0',
      source: 'Lexique 4 — Boris New & Christophe Pallier',
      entries,
    },
  };
}
