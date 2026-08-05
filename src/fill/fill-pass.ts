import { coordinateKey, type Direction, type DomainGrid, type Placement } from '../core/domain';
import { placeEntry } from '../core/grid';
import { normalizeAnswer } from '../core/normalize';

export interface FillSlot {
  readonly id: string;
  readonly row: number;
  readonly col: number;
  readonly direction: Direction;
  readonly length: number;
  readonly pattern: string;
  readonly anchors: number;
}

export interface FillPassOptions {
  readonly minLength?: number;
  readonly minAnchors?: number;
  readonly maxNodes?: number;
}

export interface FillPassStats {
  readonly nodesExplored: number;
  readonly backtracks: number;
  readonly slotsDetected: number;
  readonly slotsFilled: number;
}

export interface FillPassResult {
  readonly grid: DomainGrid;
  readonly slots: readonly FillSlot[];
  readonly filled: readonly Placement[];
  readonly unfilled: readonly FillSlot[];
  readonly stats: FillPassStats;
  readonly truncated: boolean;
}

interface Bounds { minRow: number; maxRow: number; minCol: number; maxCol: number }

function bounds(grid: DomainGrid): Bounds | undefined {
  if (grid.cells.size === 0) return undefined;
  const coords = [...grid.cells.keys()].map((key) => key.split(',').map(Number));
  const rows = coords.map(([row]) => row ?? 0);
  const cols = coords.map(([, col]) => col ?? 0);
  return { minRow: Math.min(...rows), maxRow: Math.max(...rows), minCol: Math.min(...cols), maxCol: Math.max(...cols) };
}

function coordinate(row: number, col: number, direction: Direction, offset: number): { row: number; col: number } {
  return direction === 'across' ? { row, col: col + offset } : { row: row + offset, col };
}

function patternFor(grid: DomainGrid, row: number, col: number, direction: Direction, length: number): { pattern: string; anchors: number; sameDirection: boolean } {
  let pattern = '';
  let anchors = 0;
  let sameDirection = false;
  for (let index = 0; index < length; index += 1) {
    const at = coordinate(row, col, direction, index);
    const cell = grid.cells.get(coordinateKey(at));
    if (cell) {
      pattern += cell.letter;
      anchors += 1;
      if (cell.directions.has(direction)) sameDirection = true;
    } else pattern += '?';
  }
  return { pattern, anchors, sameDirection };
}

/**
 * V0 deliberately detects only "bridge" slots: spans inside the seed grid's
 * bounding box whose endpoints are occupied, contain at least one gap, and do
 * not already overlap an entry running in the same direction.
 */
export function detectFillSlots(grid: DomainGrid, options: FillPassOptions = {}): FillSlot[] {
  const frame = bounds(grid);
  if (!frame) return [];
  const minLength = options.minLength ?? 3;
  const minAnchors = options.minAnchors ?? 2;
  const slots: FillSlot[] = [];

  for (const direction of ['across', 'down'] as const) {
    const outerMin = direction === 'across' ? frame.minRow : frame.minCol;
    const outerMax = direction === 'across' ? frame.maxRow : frame.maxCol;
    const innerMin = direction === 'across' ? frame.minCol : frame.minRow;
    const innerMax = direction === 'across' ? frame.maxCol : frame.maxRow;

    for (let outer = outerMin; outer <= outerMax; outer += 1) {
      const occupied: number[] = [];
      for (let inner = innerMin; inner <= innerMax; inner += 1) {
        const row = direction === 'across' ? outer : inner;
        const col = direction === 'across' ? inner : outer;
        if (grid.cells.has(coordinateKey({ row, col }))) occupied.push(inner);
      }

      for (let leftIndex = 0; leftIndex < occupied.length; leftIndex += 1) {
        for (let rightIndex = leftIndex + 1; rightIndex < occupied.length; rightIndex += 1) {
          const start = occupied[leftIndex]!;
          const end = occupied[rightIndex]!;
          const length = end - start + 1;
          if (length < minLength) continue;
          const row = direction === 'across' ? outer : start;
          const col = direction === 'across' ? start : outer;
          const info = patternFor(grid, row, col, direction, length);
          if (info.anchors < minAnchors || !info.pattern.includes('?') || info.sameDirection) continue;
          slots.push({ id: `${direction}:${row},${col}:${length}`, row, col, direction, length, pattern: info.pattern, anchors: info.anchors });
        }
      }
    }
  }

  return slots
    .sort((a, b) => b.anchors - a.anchors || a.length - b.length || a.id.localeCompare(b.id))
    .filter((slot, index, all) => !all.slice(0, index).some((other) => other.direction === slot.direction && other.row === slot.row && other.col === slot.col && other.length < slot.length));
}

function matches(pattern: string, word: string): boolean {
  return pattern.length === word.length && [...pattern].every((letter, index) => letter === '?' || letter === word[index]);
}

function currentPattern(grid: DomainGrid, slot: FillSlot): string {
  return patternFor(grid, slot.row, slot.col, slot.direction, slot.length).pattern;
}

export function candidatesForSlot(grid: DomainGrid, slot: FillSlot, dictionary: readonly string[], used = new Set<string>()): string[] {
  const pattern = currentPattern(grid, slot);
  return dictionary
    .map(normalizeAnswer)
    .filter((word, index, all) => word.length >= 3 && all.indexOf(word) === index && !used.has(word) && matches(pattern, word))
    .sort((a, b) => a.localeCompare(b));
}

export function fillSeedGrid(seed: DomainGrid, dictionary: readonly string[], options: FillPassOptions = {}): FillPassResult {
  const slots = detectFillSlots(seed, options);
  const maxNodes = options.maxNodes ?? 10_000;
  let nodesExplored = 0;
  let backtracks = 0;
  let truncated = false;
  let bestGrid = seed;
  let bestFilled: Placement[] = [];

  const visit = (grid: DomainGrid, remaining: readonly FillSlot[], filled: readonly Placement[], used: ReadonlySet<string>): void => {
    if (nodesExplored >= maxNodes) { truncated = true; return; }
    nodesExplored += 1;
    if (filled.length > bestFilled.length) { bestGrid = grid; bestFilled = [...filled]; }
    if (remaining.length === 0) return;

    const ranked = remaining
      .map((slot) => ({ slot, candidates: candidatesForSlot(grid, slot, dictionary, new Set(used)) }))
      .sort((a, b) => a.candidates.length - b.candidates.length || b.slot.anchors - a.slot.anchors || a.slot.id.localeCompare(b.slot.id));
    const chosen = ranked[0];
    if (!chosen || chosen.candidates.length === 0) return;
    const nextRemaining = remaining.filter(({ id }) => id !== chosen.slot.id);

    let advanced = false;
    for (const word of chosen.candidates) {
      const placement: Placement = { entry: { answer: word }, start: { row: chosen.slot.row, col: chosen.slot.col }, direction: chosen.slot.direction };
      const placed = placeEntry(grid, placement);
      if (!placed.ok) continue;
      advanced = true;
      visit(placed.grid, nextRemaining, [...filled, placement], new Set([...used, word]));
      if (truncated) return;
    }
    if (advanced) backtracks += 1;
  };

  const usedSeedWords = new Set(seed.placements.map(({ entry }) => normalizeAnswer(entry.answer)));
  visit(seed, slots, [], usedSeedWords);
  const filledIds = new Set(bestFilled.map((placement) => `${placement.direction}:${placement.start.row},${placement.start.col}:${normalizeAnswer(placement.entry.answer).length}`));
  const unfilled = slots.filter((slot) => !filledIds.has(slot.id));

  return { grid: bestGrid, slots, filled: bestFilled, unfilled, stats: { nodesExplored, backtracks, slotsDetected: slots.length, slotsFilled: bestFilled.length }, truncated };
}
