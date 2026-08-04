import { describe, expect, it } from 'vitest';
import { validateClueSet } from '../src/artifacts/clue-set';
import { CLUE_SET_PRESETS } from '../src/artifacts/clue-set-presets';

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
});
