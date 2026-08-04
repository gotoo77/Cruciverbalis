import { describe, expect, it } from 'vitest';
import {
  CLUE_SET_SCHEMA,
  cluesForAnswer,
  parseClueSetJson,
  serializeClueSet,
  validateClueSet,
  type ClueSet,
} from '../src/artifacts/clue-set';

const fixture: ClueSet = {
  schema: CLUE_SET_SCHEMA,
  id: 'fruit-fr-v1',
  name: 'Fruits FR',
  language: 'fr',
  clues: [
    {
      id: 'pasteque-definition',
      answer: 'PASTÈQUE',
      kind: 'definition',
      text: 'Gros fruit à chair rouge et riche en eau.',
      difficulty: 1,
    },
    {
      id: 'pasteque-wordplay',
      answer: 'PASTEQUE',
      kind: 'wordplay',
      text: 'Elle a le cœur rouge mais ne bat jamais.',
      difficulty: 3,
    },
  ],
};

describe('ClueSet v1', () => {
  it('accepts several typed clues for the same answer', () => {
    const result = validateClueSet(fixture);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.clues).toHaveLength(2);
    expect(result.value.clues.map(({ kind }) => kind)).toEqual(['definition', 'wordplay']);
  });

  it('matches answers independently of accents and case', () => {
    expect(cluesForAnswer(fixture, 'pastèque')).toHaveLength(2);
    expect(cluesForAnswer(fixture, 'PASTEQUE')).toHaveLength(2);
  });

  it('rejects unknown clue kinds and duplicate clue ids', () => {
    const result = validateClueSet({
      ...fixture,
      clues: [
        fixture.clues[0],
        { ...fixture.clues[1], id: 'pasteque-definition', kind: 'mystery' },
      ],
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some(({ path }) => path.endsWith('.kind'))).toBe(true);
    expect(result.issues.some(({ message }) => message === 'duplicates another clue id')).toBe(true);
  });

  it('round-trips through JSON serialization', () => {
    const parsed = parseClueSetJson(serializeClueSet(fixture));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value).toEqual(fixture);
  });

  it('validates difficulty and confidence ranges', () => {
    const result = validateClueSet({
      ...fixture,
      clues: [{
        id: 'bad',
        answer: 'CHAT',
        kind: 'analogy',
        text: 'Fixture',
        difficulty: 9,
        confidence: 2,
      }],
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.map(({ path }) => path)).toContain('$.clues[0].difficulty');
    expect(result.issues.map(({ path }) => path)).toContain('$.clues[0].confidence');
  });
});
