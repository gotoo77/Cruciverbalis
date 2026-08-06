import { describe, expect, it } from 'vitest';
import { analyzeClueCoverage } from '../src/artifacts/clue-coverage';
import { validateClueSet } from '../src/artifacts/clue-set';
import { CLUE_SET_PRESETS, findClueSetPreset } from '../src/artifacts/clue-set-presets';
import { WORD_SET_PRESETS } from '../src/artifacts/word-set-presets';

describe('built-in ClueSet presets', () => {
  it('all conform to the versioned ClueSet contract', () => {
    for (const preset of CLUE_SET_PRESETS) {
      expect(validateClueSet(preset)).toMatchObject({ ok: true });
    }
  });

  it('demonstrates several editorial clue kinds', () => {
    const kinds = new Set(CLUE_SET_PRESETS.flatMap(({ clues }) => clues.map(({ kind }) => kind)));

    expect(kinds).toContain('definition');
    expect(kinds).toContain('wordplay');
    expect(kinds).toContain('analogy');
    expect(kinds).toContain('historical');
    expect(kinds).toContain('etymology');
  });

  it('couvre entièrement chaque WordSet prédéfini par son ClueSet homonyme', () => {
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
});
