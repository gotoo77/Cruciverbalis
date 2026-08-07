import type { Direction, DomainGrid } from '../core/domain';
import { normalizeAnswer } from '../core/normalize';
import type { ArtifactProvenance } from './word-set';

export const EDITORIAL_LOCK_SET_SCHEMA = 'cruciverbalis.editorial-lock-set.v1' as const;

export interface PlacementEditorialLock {
  readonly kind: 'placement';
  readonly answer: string;
  readonly row: number;
  readonly col: number;
  readonly direction: Direction;
  readonly reason?: string;
}

export interface EditorialLockSet {
  readonly schema: typeof EDITORIAL_LOCK_SET_SCHEMA;
  readonly id: string;
  readonly name: string;
  readonly locks: readonly PlacementEditorialLock[];
  readonly provenance?: ArtifactProvenance;
}

export interface EditorialLockConflict {
  readonly lock: PlacementEditorialLock;
  readonly code: 'locked-placement-missing';
  readonly message: string;
}

export interface EditorialLockCheck {
  readonly respected: boolean;
  readonly conflicts: readonly EditorialLockConflict[];
}

/** Vérifie qu'une grille dérivée respecte toutes les décisions humaines verrouillées. */
export function checkEditorialLocks(grid: DomainGrid, lockSet: EditorialLockSet): EditorialLockCheck {
  const conflicts = lockSet.locks.flatMap((lock): EditorialLockConflict[] => {
    const found = grid.placements.some(({ entry, start, direction }) =>
      normalizeAnswer(entry.answer) === normalizeAnswer(lock.answer) &&
      start.row === lock.row &&
      start.col === lock.col &&
      direction === lock.direction,
    );
    return found ? [] : [{
      lock,
      code: 'locked-placement-missing',
      message: `le placement verrouillé ${normalizeAnswer(lock.answer)} @ ${lock.row},${lock.col} ${lock.direction} a été modifié ou supprimé`,
    }];
  });
  return { respected: conflicts.length === 0, conflicts };
}

export function serializeEditorialLockSet(lockSet: EditorialLockSet): string {
  return JSON.stringify(lockSet, null, 2);
}
