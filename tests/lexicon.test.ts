import { describe, expect, it } from 'vitest';
import { LEXICON_SCHEMA, lexiconToCandidates, parseLexiconJson, serializeLexicon, validateLexicon } from '../src/api';

const fixture = {
  schema: LEXICON_SCHEMA,
  id: 'fr-demo-v1',
  name: 'Lexique français de démonstration',
  language: 'fr',
  source: 'fixture de test',
  license: 'CC0-1.0',
  entries: [
    { word: 'été', frequency: 0.92 },
    { word: 'CHAT', frequency: 0.8 },
    { word: 'SNCF', frequency: 0.4, abbreviation: true },
    { word: 'XYLOGRAPHE', frequency: 0.05, rare: true },
  ],
} as const;

describe('Lexicon v1', () => {
  it('normalise les mots tout en conservant les signaux lexicaux', () => {
    const result = validateLexicon(fixture);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.entries[0]).toEqual({ word: 'ETE', frequency: 0.92, abbreviation: undefined, rare: undefined });
    expect(result.value.entries[2]).toMatchObject({ word: 'SNCF', abbreviation: true });
  });

  it('refuse les doublons après normalisation et les fréquences hors domaine', () => {
    const result = validateLexicon({ ...fixture, entries: [{ word: 'été' }, { word: 'ETE', frequency: 2 }] });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.map(({ path }) => path)).toContain('$.entries[1].word');
    expect(result.issues.map(({ path }) => path)).toContain('$.entries[1].frequency');
  });

  it('fait un aller-retour JSON déterministe', () => {
    const validated = validateLexicon(fixture);
    expect(validated.ok).toBe(true);
    if (!validated.ok) return;
    const parsed = parseLexiconJson(serializeLexicon(validated.value));
    expect(parsed).toEqual(validated);
  });

  it('se branche directement sur le contrat de candidats du FillPass', () => {
    const validated = validateLexicon(fixture);
    expect(validated.ok).toBe(true);
    if (!validated.ok) return;
    expect(lexiconToCandidates(validated.value)).toEqual(validated.value.entries);
  });
});
