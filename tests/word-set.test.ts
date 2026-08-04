import { describe, expect, it } from 'vitest';

import {
  WORD_SET_PRESETS,
  WORD_SET_SCHEMA,
  parseWordSetJson,
  serializeWordSet,
  validateWordSet,
  wordSetToEntries,
} from '../src/api';

describe('WordSet artifact', () => {
  it('accepts a valid versioned artifact', () => {
    const result = validateWordSet({
      schema: WORD_SET_SCHEMA,
      id: 'fruit-fr-v1',
      name: 'Fruits',
      language: 'fr',
      entries: [
        { answer: 'PASTÈQUE', theme: 'fruit', difficulty: 2 },
        { answer: 'POIRE' },
      ],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.entries).toHaveLength(2);
    expect(wordSetToEntries(result.value)[0]).toMatchObject({ answer: 'PASTÈQUE', theme: 'fruit' });
  });

  it('rejects duplicate answers after normalization', () => {
    const result = validateWordSet({
      schema: WORD_SET_SCHEMA,
      id: 'duplicate',
      name: 'Duplicate',
      language: 'fr',
      entries: [{ answer: 'chat' }, { answer: 'CHAT' }],
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues).toContainEqual({
      path: '$.entries[1].answer',
      message: 'duplicates another answer after normalization',
    });
  });

  it('reports malformed JSON without throwing', () => {
    const result = parseWordSetJson('{ nope');
    expect(result.ok).toBe(false);
  });

  it('round-trips through the canonical serializer', () => {
    const preset = WORD_SET_PRESETS[0];
    expect(preset).toBeDefined();
    if (!preset) return;

    const parsed = parseWordSetJson(serializeWordSet(preset));
    expect(parsed).toEqual({ ok: true, value: preset });
  });

  it('ships only valid built-in presets', () => {
    expect(WORD_SET_PRESETS.length).toBeGreaterThanOrEqual(3);
    for (const preset of WORD_SET_PRESETS) {
      expect(validateWordSet(preset)).toEqual({ ok: true, value: preset });
    }
  });
});
