import { describe, expect, it } from 'vitest';
import { DEFAULT_LEXICAL_QUALITY_POLICY, normalizeLexicon, scoreLexicalCandidate } from '../src/fill/lexical-quality';

describe('qualité lexicale du FillPass', () => {
  it('écarte par défaut les abréviations et les mots trop courts', () => {
    expect(scoreLexicalCandidate({ word: 'TV', frequency: 1 })).toBeUndefined();
    expect(scoreLexicalCandidate({ word: 'ABC', abbreviation: true, frequency: 1 })).toBeUndefined();
  });

  it('préfère un mot courant à un terme rare de même longueur', () => {
    const courant = scoreLexicalCandidate({ word: 'TABLE', frequency: 0.9 });
    const rare = scoreLexicalCandidate({ word: 'TAVEL', frequency: 0.1, rare: true });
    expect(courant?.score).toBeGreaterThan(rare?.score ?? 0);
  });

  it('conserve le meilleur signal de fréquence pour un doublon normalisé', () => {
    const lexique = normalizeLexicon([
      { word: 'été', frequency: 0.2 },
      { word: 'ETE', frequency: 0.9 },
    ]);
    expect(lexique).toHaveLength(1);
    expect(lexique[0]).toMatchObject({ word: 'ETE', frequency: 0.9 });
  });

  it('expose une politique explicite et modifiable plutôt qu’un score caché', () => {
    const score = scoreLexicalCandidate({ word: 'CHAT', frequency: 1 }, { ...DEFAULT_LEXICAL_QUALITY_POLICY, frequencyWeight: 0, lengthWeight: 1, shortWordPenalty: 0 });
    expect(score?.score).toBe(4);
  });
});
