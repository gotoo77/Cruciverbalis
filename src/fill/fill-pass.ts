import { coordinateKey, type Direction, type DomainGrid, type Placement } from '../core/domain';
import { placeEntry } from '../core/grid';
import { normalizeAnswer } from '../core/normalize';
import { checkEditorialLocks, type EditorialLockConflict, type EditorialLockSet } from '../artifacts/editorial-lock-set';
import {
  DEFAULT_LEXICAL_QUALITY_POLICY,
  normalizeLexicon,
  scoreLexicalCandidate,
  type LexicalCandidate,
  type LexicalQualityPolicy,
  type ScoredLexicalCandidate,
} from './lexical-quality';

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
  readonly lexicalPolicy?: Partial<LexicalQualityPolicy>;
  /** Décisions éditoriales humaines à préserver comme contraintes dures. */
  readonly editorialLocks?: EditorialLockSet;
}

export interface FillPassStats {
  readonly nodesExplored: number;
  readonly backtracks: number;
  readonly slotsDetected: number;
  readonly slotsFilled: number;
  readonly lexicalScore: number;
}

export interface FillPassResult {
  readonly grid: DomainGrid;
  readonly slots: readonly FillSlot[];
  readonly filled: readonly Placement[];
  readonly unfilled: readonly FillSlot[];
  readonly stats: FillPassStats;
  readonly truncated: boolean;
  /** Conflits explicites si la grille d'entrée ne respecte déjà plus les choix humains. */
  readonly editorialConflicts: readonly EditorialLockConflict[];
}

interface Bounds {
  minRow: number;
  maxRow: number;
  minCol: number;
  maxCol: number;
}

function bounds(grid: DomainGrid): Bounds | undefined {
  if (grid.cells.size === 0) return undefined;
  const coords = [...grid.cells.keys()].map((key) => key.split(',').map(Number));
  const rows = coords.map(([row]) => row ?? 0);
  const cols = coords.map(([, col]) => col ?? 0);
  return {
    minRow: Math.min(...rows),
    maxRow: Math.max(...rows),
    minCol: Math.min(...cols),
    maxCol: Math.max(...cols),
  };
}

function coordinate(row: number, col: number, direction: Direction, offset: number) {
  return direction === 'across' ? { row, col: col + offset } : { row: row + offset, col };
}

function patternFor(grid: DomainGrid, row: number, col: number, direction: Direction, length: number) {
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
  return slots.sort((a, b) => b.anchors - a.anchors || a.length - b.length || a.id.localeCompare(b.id)).filter((slot, index, all) => !all.slice(0, index).some((other) => other.direction === slot.direction && other.row === slot.row && other.col === slot.col && other.length < slot.length));
}

function matches(pattern: string, word: string): boolean {
  return pattern.length === word.length && [...pattern].every((letter, index) => letter === '?' || letter === word[index]);
}
function currentPattern(grid: DomainGrid, slot: FillSlot): string { return patternFor(grid, slot.row, slot.col, slot.direction, slot.length).pattern; }
function policyFor(options: FillPassOptions): LexicalQualityPolicy { return { ...DEFAULT_LEXICAL_QUALITY_POLICY, minLength: options.minLength ?? DEFAULT_LEXICAL_QUALITY_POLICY.minLength, ...options.lexicalPolicy }; }
function scoredCandidatesForSlot(grid: DomainGrid, slot: FillSlot, dictionary: readonly (string | LexicalCandidate)[], used: ReadonlySet<string>, policy: LexicalQualityPolicy): ScoredLexicalCandidate[] {
  const pattern = currentPattern(grid, slot);
  return normalizeLexicon(dictionary).map((candidate) => scoreLexicalCandidate(candidate, policy)).filter((candidate): candidate is ScoredLexicalCandidate => Boolean(candidate)).filter(({ word }) => !used.has(word) && matches(pattern, word)).sort((a, b) => b.score - a.score || a.word.localeCompare(b.word));
}
export function candidatesForSlot(grid: DomainGrid, slot: FillSlot, dictionary: readonly (string | LexicalCandidate)[], used = new Set<string>(), policy: LexicalQualityPolicy = DEFAULT_LEXICAL_QUALITY_POLICY): string[] {
  return scoredCandidatesForSlot(grid, slot, dictionary, used, policy).map(({ word }) => word);
}

export function fillSeedGrid(seed: DomainGrid, dictionary: readonly (string | LexicalCandidate)[], options: FillPassOptions = {}): FillPassResult {
  const slots = detectFillSlots(seed, options);
  const initialLockCheck = options.editorialLocks ? checkEditorialLocks(seed, options.editorialLocks) : { respected: true, conflicts: [] };
  const emptyResult = (conflicts: readonly EditorialLockConflict[]): FillPassResult => ({ grid: seed, slots, filled: [], unfilled: slots, stats: { nodesExplored: 0, backtracks: 0, slotsDetected: slots.length, slotsFilled: 0, lexicalScore: 0 }, truncated: false, editorialConflicts: conflicts });
  if (!initialLockCheck.respected) return emptyResult(initialLockCheck.conflicts);

  const maxNodes = options.maxNodes ?? 10_000;
  const policy = policyFor(options);
  let nodesExplored = 0, backtracks = 0, truncated = false, bestScore = Number.NEGATIVE_INFINITY;
  let bestGrid = seed;
  let bestFilled: Placement[] = [];
  const visit = (grid: DomainGrid, remaining: readonly FillSlot[], filled: readonly Placement[], used: ReadonlySet<string>, lexicalScore: number): void => {
    if (nodesExplored >= maxNodes) { truncated = true; return; }
    nodesExplored += 1;
    if (options.editorialLocks && !checkEditorialLocks(grid, options.editorialLocks).respected) return;
    if (filled.length > bestFilled.length || (filled.length === bestFilled.length && lexicalScore > bestScore)) { bestGrid = grid; bestFilled = [...filled]; bestScore = lexicalScore; }
    if (remaining.length === 0) return;
    const ranked = remaining.map((slot) => ({ slot, candidates: scoredCandidatesForSlot(grid, slot, dictionary, used, policy) })).sort((a, b) => a.candidates.length - b.candidates.length || b.slot.anchors - a.slot.anchors || a.slot.id.localeCompare(b.slot.id));
    const chosen = ranked[0];
    if (!chosen || chosen.candidates.length === 0) return;
    const nextRemaining = remaining.filter(({ id }) => id !== chosen.slot.id);
    let advanced = false;
    for (const candidate of chosen.candidates) {
      const placement: Placement = { entry: { answer: candidate.word }, start: { row: chosen.slot.row, col: chosen.slot.col }, direction: chosen.slot.direction };
      const placed = placeEntry(grid, placement);
      if (!placed.ok) continue;
      if (options.editorialLocks && !checkEditorialLocks(placed.grid, options.editorialLocks).respected) continue;
      advanced = true;
      visit(placed.grid, nextRemaining, [...filled, placement], new Set([...used, candidate.word]), lexicalScore + candidate.score);
      if (truncated) return;
    }
    if (advanced) backtracks += 1;
  };
  const usedSeedWords = new Set(seed.placements.map(({ entry }) => normalizeAnswer(entry.answer)));
  visit(seed, slots, [], usedSeedWords, 0);
  const filledIds = new Set(bestFilled.map((placement) => `${placement.direction}:${placement.start.row},${placement.start.col}:${normalizeAnswer(placement.entry.answer).length}`));
  return { grid: bestGrid, slots, filled: bestFilled, unfilled: slots.filter((slot) => !filledIds.has(slot.id)), stats: { nodesExplored, backtracks, slotsDetected: slots.length, slotsFilled: bestFilled.length, lexicalScore: bestFilled.length === 0 ? 0 : bestScore }, truncated, editorialConflicts: [] };
}
