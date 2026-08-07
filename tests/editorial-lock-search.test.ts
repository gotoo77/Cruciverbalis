import { describe, expect, it } from 'vitest';
import { generate } from '../src/api/generate';
import { EDITORIAL_LOCK_SET_SCHEMA, type EditorialLockSet } from '../src/artifacts/editorial-lock-set';

function locks(...items: EditorialLockSet['locks']): EditorialLockSet {
  return { schema: EDITORIAL_LOCK_SET_SCHEMA, id: 'test-locks', name: 'test', locks: items };
}

const chat = { answer: 'CHAT' };
const hache = { answer: 'HACHE' };

function placement(answer: string, row: number, col: number, direction: 'across' | 'down') {
  return { kind: 'placement' as const, answer, row, col, direction };
}

describe('editorial locks as search constraints', () => {
  it.each(['backtracking', 'pareto'] as const)('seeds a valid locked placement for %s', (strategy) => {
    const result = generate({ entries: [chat, hache], strategy, editorialLocks: locks(placement('CHAT', 2, 3, 'across')) });
    expect(result.lockConflicts ?? []).toHaveLength(0);
    expect(result.solutions.length).toBeGreaterThan(0);
    expect(result.solutions.every(({ grid }) => grid.placements.some((p) =>
      p.entry.answer === 'CHAT' && p.start.row === 2 && p.start.col === 3 && p.direction === 'across'))).toBe(true);
  });

  it('builds remaining entries around the locked placement', () => {
    const result = generate({ entries: [chat, hache], editorialLocks: locks(placement('CHAT', 2, 3, 'across')) });
    expect(result.solutions[0]?.grid.placements.map((p) => p.entry.answer)).toContain('HACHE');
  });

  it('rejects a lock whose answer is absent before search', () => {
    const result = generate({ entries: [chat], editorialLocks: locks(placement('CHIEN', 0, 0, 'across')) });
    expect(result.solutions).toHaveLength(0);
    expect(result.lockConflicts?.[0]?.code).toBe('locked-answer-not-found');
    expect(result.search).toBeUndefined();
  });

  it('rejects contradictory locks for the same answer', () => {
    const result = generate({ entries: [chat], editorialLocks: locks(
      placement('CHAT', 0, 0, 'across'), placement('CHAT', 2, 0, 'across')) });
    expect(result.solutions).toHaveLength(0);
    expect(result.lockConflicts?.some((c) => c.code === 'contradictory-locked-placement')).toBe(true);
  });

  it('accepts compatible crossing locks', () => {
    const result = generate({ entries: [chat, hache], editorialLocks: locks(
      placement('CHAT', 0, 0, 'across'), placement('HACHE', 0, 1, 'down')) });
    expect(result.lockConflicts ?? []).toHaveLength(0);
    expect(result.solutions[0]?.grid.placements).toHaveLength(2);
  });

  it('rejects locked placements with conflicting crossing letters', () => {
    const result = generate({ entries: [chat, { answer: 'TAXE' }], editorialLocks: locks(
      placement('CHAT', 0, 0, 'across'), placement('TAXE', 0, 1, 'down')) });
    expect(result.solutions).toHaveLength(0);
    expect(result.lockConflicts?.some((c) => c.code === 'locked-placement-invalid')).toBe(true);
  });
});
