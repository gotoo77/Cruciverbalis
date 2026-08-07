import { describe, expect, it } from 'vitest';
import { EDITORIAL_LOCK_SET_SCHEMA, checkEditorialLocks, type EditorialLockSet } from '../src/artifacts/editorial-lock-set';
import { createEmptyGrid, placeEntry } from '../src/core/grid';

function gridAt(row: number, col: number) {
  const placed = placeEntry(createEmptyGrid(), {
    entry: { answer: 'CHAT' },
    start: { row, col },
    direction: 'across',
  });
  if (!placed.ok) throw new Error(placed.code);
  return placed.grid;
}

const locks: EditorialLockSet = {
  schema: EDITORIAL_LOCK_SET_SCHEMA,
  id: 'gotoo-edit-v1',
  name: 'Décisions éditoriales',
  locks: [{ kind: 'placement', answer: 'Chât', row: 2, col: 3, direction: 'across', reason: 'Je garde celui-là.' }],
};

describe('autorité éditoriale humaine', () => {
  it('accepte une dérivation qui conserve exactement le placement verrouillé', () => {
    expect(checkEditorialLocks(gridAt(2, 3), locks)).toEqual({ respected: true, conflicts: [] });
  });

  it('refuse explicitement une dérivation qui déplace une décision humaine', () => {
    const result = checkEditorialLocks(gridAt(4, 3), locks);
    expect(result.respected).toBe(false);
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0]?.code).toBe('locked-placement-missing');
  });
});
