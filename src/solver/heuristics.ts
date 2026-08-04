import type { DomainGrid, Entry } from '../core/domain';

export interface EntryChoice<TCandidate> {
  readonly entry: Entry;
  readonly candidates: readonly TCandidate[];
  readonly rest: readonly Entry[];
}

export type CandidateProvider<TCandidate> = (
  grid: DomainGrid,
  entry: Entry,
) => readonly TCandidate[];

/**
 * Chooses the pending entry with the fewest currently valid placements.
 *
 * Entries with no current placement are deliberately deferred while another
 * entry can still extend the grid: a word disconnected now may become
 * connectable after an intermediate word is placed.
 */
export function chooseMostConstrained<TCandidate>(
  grid: DomainGrid,
  pending: readonly Entry[],
  candidatesFor: CandidateProvider<TCandidate>,
): EntryChoice<TCandidate> | undefined {
  let bestIndex = -1;
  let bestCandidates: readonly TCandidate[] = [];

  for (let index = 0; index < pending.length; index += 1) {
    const entry = pending[index];
    if (!entry) continue;

    const candidates = candidatesFor(grid, entry);
    if (candidates.length === 0) continue;

    const bestEntry = bestIndex >= 0 ? pending[bestIndex] : undefined;
    const better =
      bestIndex < 0 ||
      candidates.length < bestCandidates.length ||
      (candidates.length === bestCandidates.length &&
        (entry.answer.length > (bestEntry?.answer.length ?? -1) ||
          (entry.answer.length === (bestEntry?.answer.length ?? -1) &&
            entry.answer.localeCompare(bestEntry?.answer ?? '') < 0)));

    if (better) {
      bestIndex = index;
      bestCandidates = candidates;
    }
  }

  if (bestIndex < 0) {
    const entry = pending[0];
    if (!entry) return undefined;
    return { entry, candidates: [], rest: pending.slice(1) };
  }

  const entry = pending[bestIndex];
  if (!entry) return undefined;

  return {
    entry,
    candidates: bestCandidates,
    rest: [...pending.slice(0, bestIndex), ...pending.slice(bestIndex + 1)],
  };
}
