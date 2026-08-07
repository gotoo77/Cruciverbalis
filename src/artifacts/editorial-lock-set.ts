import type { Direction, DomainGrid, Entry } from '../core/domain';
import { createEmptyGrid, placeEntry } from '../core/grid';
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

export type EditorialLockConflictCode =
  | 'locked-placement-missing'
  | 'locked-answer-not-found'
  | 'contradictory-locked-placement'
  | 'locked-placement-invalid';

export interface EditorialLockConflict {
  readonly lock: PlacementEditorialLock;
  readonly code: EditorialLockConflictCode;
  readonly message: string;
}

export interface EditorialLockCheck {
  readonly respected: boolean;
  readonly conflicts: readonly EditorialLockConflict[];
}

export interface PreparedEditorialConstraints {
  readonly initialGrid: DomainGrid;
  readonly remainingEntries: readonly Entry[];
  readonly conflicts: readonly EditorialLockConflict[];
  readonly lockedPlacementsSeeded: number;
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

/**
 * Transforme les décisions éditoriales en état initial du CSP.
 * Le solveur n'a pas besoin de connaître EditorialLockSet : il reçoit seulement
 * une grille déjà contrainte et les entrées qu'il lui reste à explorer.
 */
export function prepareEditorialConstraints(
  entries: readonly Entry[],
  lockSet: EditorialLockSet,
): PreparedEditorialConstraints {
  const normalizedEntries = entries.map((entry) => ({
    source: entry,
    answer: normalizeAnswer(entry.answer),
  }));
  const conflicts: EditorialLockConflict[] = [];
  const claimedAnswers = new Map<string, PlacementEditorialLock>();
  const lockedSources = new Set<Entry>();
  let grid = createEmptyGrid();
  let seeded = 0;

  for (const lock of lockSet.locks) {
    const answer = normalizeAnswer(lock.answer);
    const previous = claimedAnswers.get(answer);
    if (previous && (
      previous.row !== lock.row ||
      previous.col !== lock.col ||
      previous.direction !== lock.direction
    )) {
      conflicts.push({
        lock,
        code: 'contradictory-locked-placement',
        message: `plusieurs placements incompatibles sont verrouillés pour ${answer}`,
      });
      continue;
    }
    if (previous) continue;
    claimedAnswers.set(answer, lock);

    const matching = normalizedEntries.find(({ source, answer: candidate }) =>
      candidate === answer && !lockedSources.has(source),
    );
    if (!matching) {
      conflicts.push({
        lock,
        code: 'locked-answer-not-found',
        message: `la réponse verrouillée ${answer} n'existe pas dans les entrées de génération`,
      });
      continue;
    }

    const placed = placeEntry(grid, {
      entry: matching.source,
      start: { row: lock.row, col: lock.col },
      direction: lock.direction,
    });
    if (!placed.ok) {
      conflicts.push({
        lock,
        code: 'locked-placement-invalid',
        message: `le placement verrouillé ${answer} @ ${lock.row},${lock.col} ${lock.direction} est incompatible: ${placed.code}`,
      });
      continue;
    }

    grid = placed.grid;
    lockedSources.add(matching.source);
    seeded += 1;
  }

  if (conflicts.length > 0) {
    return {
      initialGrid: createEmptyGrid(),
      remainingEntries: [...entries],
      conflicts,
      lockedPlacementsSeeded: 0,
    };
  }

  return {
    initialGrid: grid,
    remainingEntries: entries.filter((entry) => !lockedSources.has(entry)),
    conflicts: [],
    lockedPlacementsSeeded: seeded,
  };
}

export function serializeEditorialLockSet(lockSet: EditorialLockSet): string {
  return JSON.stringify(lockSet, null, 2);
}
