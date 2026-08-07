import { describe, expect, it } from 'vitest';
import { deriveCrossword } from '../src/api/derive-crossword';
import { CLUE_SET_SCHEMA, type ClueSet } from '../src/artifacts/clue-set';
import { EDITORIAL_LOCK_SET_SCHEMA, type EditorialLockSet } from '../src/artifacts/editorial-lock-set';
import { LEXICON_SCHEMA, type Lexicon } from '../src/artifacts/lexicon';
import { WORD_SET_SCHEMA, type WordSet } from '../src/artifacts/word-set';

const wordSet: WordSet = {
  schema: WORD_SET_SCHEMA,
  id: 'words-001',
  name: 'Test',
  language: 'fr',
  entries: [{ answer: 'CHAT' }, { answer: 'TACHE' }],
};

const clueSet: ClueSet = {
  schema: CLUE_SET_SCHEMA,
  id: 'clues-001',
  name: 'Indices test',
  language: 'fr',
  clues: [],
};

const lexicon: Lexicon = {
  schema: LEXICON_SCHEMA,
  id: 'lexicon-001',
  name: 'Lexique test',
  language: 'fr',
  entries: [],
};

const locks: EditorialLockSet = {
  schema: EDITORIAL_LOCK_SET_SCHEMA,
  id: 'locks-001',
  name: 'Décisions humaines',
  locks: [{ kind: 'placement', answer: 'CHAT', row: 0, col: 0, direction: 'across' }],
};

describe('deriveCrossword', () => {
  it('derives from identified artifacts and records exactly those participants', () => {
    const result = deriveCrossword({
      derivationId: 'derivation-001',
      outputArtifactId: 'crossword-001',
      artifacts: { wordSet, clueSet, lexicon, editorialLocks: locks },
      generation: { strategy: 'backtracking', maxNodes: 1000, entryOrdering: 'mrv' },
      createdAt: '2026-08-07T15:00:00Z',
    });

    expect(result.generation.solutions.length).toBeGreaterThan(0);
    expect(result.derivation.sources).toEqual([
      { kind: 'word-set', artifactId: 'words-001' },
      { kind: 'clue-set', artifactId: 'clues-001' },
      { kind: 'lexicon', artifactId: 'lexicon-001' },
    ]);
    expect(result.derivation.decisions).toEqual([
      { kind: 'editorial-lock-set', artifactId: 'locks-001' },
    ]);
    expect(result.derivation.generation).toEqual({
      strategy: 'backtracking',
      maxNodes: 1000,
      entryOrdering: 'mrv',
      branchAndBound: undefined,
    });
  });

  it('does not claim optional artifacts that did not participate', () => {
    const result = deriveCrossword({
      derivationId: 'derivation-002',
      outputArtifactId: 'crossword-002',
      artifacts: { wordSet },
    });

    expect(result.derivation.sources).toEqual([
      { kind: 'word-set', artifactId: 'words-001' },
    ]);
    expect(result.derivation.decisions).toEqual([]);
    expect(result.derivation.generation.strategy).toBe('backtracking');
  });
});
