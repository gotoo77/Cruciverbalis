import { describe, expect, it } from 'vitest';
import {
  DERIVATION_RECORD_SCHEMA,
  createDerivationRecord,
  serializeDerivationRecord,
} from '../src/artifacts/derivation-record';

describe('DerivationRecord', () => {
  it('records sources, human decisions, generation config and produced artifact', () => {
    const record = createDerivationRecord({
      id: 'derivation-001',
      outputArtifactId: 'crossword-001',
      sources: [
        { kind: 'word-set', artifactId: 'words-001' },
        { kind: 'clue-set', artifactId: 'clues-001' },
        { kind: 'lexicon', artifactId: 'lexique4-fr' },
      ],
      editorialLockSetId: 'locks-001',
      generation: {
        strategy: 'backtracking',
        maxNodes: 5000,
        entryOrdering: 'mrv',
        branchAndBound: true,
      },
      createdAt: '2026-08-07T15:00:00Z',
    });

    expect(record).toEqual({
      schema: DERIVATION_RECORD_SCHEMA,
      id: 'derivation-001',
      outputArtifactId: 'crossword-001',
      sources: [
        { kind: 'word-set', artifactId: 'words-001' },
        { kind: 'clue-set', artifactId: 'clues-001' },
        { kind: 'lexicon', artifactId: 'lexique4-fr' },
      ],
      decisions: [{ kind: 'editorial-lock-set', artifactId: 'locks-001' }],
      generation: {
        strategy: 'backtracking',
        maxNodes: 5000,
        entryOrdering: 'mrv',
        branchAndBound: true,
      },
      createdAt: '2026-08-07T15:00:00Z',
    });
  });

  it('does not invent decisions when no editorial lock set participated', () => {
    const record = createDerivationRecord({
      id: 'derivation-002',
      outputArtifactId: 'crossword-002',
      generation: { strategy: 'pareto' },
    });

    expect(record.sources).toEqual([]);
    expect(record.decisions).toEqual([]);
  });

  it('serializes as a stable artifact with a trailing newline', () => {
    const record = createDerivationRecord({
      id: 'derivation-003',
      outputArtifactId: 'crossword-003',
      sources: [{ kind: 'word-set', artifactId: 'words-003' }],
      generation: { strategy: 'greedy' },
    });

    const serialized = serializeDerivationRecord(record);
    expect(serialized.endsWith('\n')).toBe(true);
    expect(JSON.parse(serialized)).toEqual(record);
  });
});
