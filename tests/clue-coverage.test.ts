import { describe, expect, it } from 'vitest';
import { analyzeClueCoverage } from '../src/artifacts/clue-coverage';
import { CLUE_SET_PRESETS, findClueSetPreset } from '../src/artifacts/clue-set-presets';
import { WORD_SET_PRESETS } from '../src/artifacts/word-set-presets';

describe('couverture des ClueSets', () => {
  it('couvre intégralement chaque WordSet prédéfini par un ClueSet homonyme', () => {
    for (const wordSet of WORD_SET_PRESETS) {
      const clueSet = findClueSetPreset(wordSet.id);
      expect(clueSet, `ClueSet manquant pour ${wordSet.id}`).toBeDefined();
      if (!clueSet) continue;

      expect(analyzeClueCoverage(wordSet, clueSet)).toEqual({
        totalAnswers: wordSet.entries.length,
        coveredAnswers: wordSet.entries.length,
        missingAnswers: [],
        coverage: 1,
      });
    }
  });

  it('rend les trous de couverture explicites', () => {
    const wordSet = WORD_SET_PRESETS.find(({ id }) => id === 'energie-fr-v1');
    const fruit = CLUE_SET_PRESETS.find(({ id }) => id === 'fruit-fr-v1');
    if (!wordSet || !fruit) throw new Error('fixtures attendues absentes');

    const coverage = analyzeClueCoverage(wordSet, fruit);
    expect(coverage.coverage).toBe(0);
    expect(coverage.missingAnswers).toContain('NUCLEAIRE');
    expect(coverage.missingAnswers).toContain('URANIUM');
  });
});
