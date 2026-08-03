import { normalizeEntries } from './normalize';
import type { CrosswordGrid, GridCell, Orientation, Placement, WordEntry } from './types';

const key = (row: number, col: number): string => `${row},${col}`;

function cloneCells(cells: Map<string, GridCell>): Map<string, GridCell> {
  return new Map([...cells].map(([position, cell]) => [position, { ...cell }]));
}

function canPlace(
  cells: Map<string, GridCell>,
  answer: string,
  row: number,
  col: number,
  orientation: Orientation,
): boolean {
  const dr = orientation === 'down' ? 1 : 0;
  const dc = orientation === 'across' ? 1 : 0;

  for (let index = 0; index < answer.length; index += 1) {
    const r = row + dr * index;
    const c = col + dc * index;
    const existing = cells.get(key(r, c));

    if (existing && existing.letter !== answer[index]) return false;
    if (existing && ((orientation === 'across' && existing.across) || (orientation === 'down' && existing.down))) {
      return false;
    }

    if (!existing) {
      const neighbours = orientation === 'across'
        ? [cells.get(key(r - 1, c)), cells.get(key(r + 1, c))]
        : [cells.get(key(r, c - 1)), cells.get(key(r, c + 1))];
      if (neighbours.some(Boolean)) return false;
    }
  }

  const before = cells.get(key(row - dr, col - dc));
  const after = cells.get(key(row + dr * answer.length, col + dc * answer.length));
  return !before && !after;
}

function writePlacement(cells: Map<string, GridCell>, placement: Placement): void {
  const dr = placement.orientation === 'down' ? 1 : 0;
  const dc = placement.orientation === 'across' ? 1 : 0;

  [...placement.answer].forEach((letter, index) => {
    const position = key(placement.row + dr * index, placement.col + dc * index);
    const cell = cells.get(position) ?? { letter, across: false, down: false };
    cell.letter = letter;
    cell[placement.orientation] = true;
    cells.set(position, cell);
  });
}

function candidatePlacements(cells: Map<string, GridCell>, entry: WordEntry): Placement[] {
  const candidates: Placement[] = [];

  for (const [position, cell] of cells) {
    const [rowText, colText] = position.split(',');
    const row = Number(rowText);
    const col = Number(colText);

    [...entry.answer].forEach((letter, index) => {
      if (letter !== cell.letter) return;

      const across: Placement = { ...entry, row, col: col - index, orientation: 'across' };
      const down: Placement = { ...entry, row: row - index, col, orientation: 'down' };
      if (canPlace(cells, entry.answer, across.row, across.col, across.orientation)) candidates.push(across);
      if (canPlace(cells, entry.answer, down.row, down.col, down.orientation)) candidates.push(down);
    });
  }

  return candidates;
}

function bounds(cells: Map<string, GridCell>): { width: number; height: number } {
  const coordinates = [...cells.keys()].map((position) => position.split(',').map(Number));
  const rows = coordinates.map(([row]) => row ?? 0);
  const cols = coordinates.map(([, col]) => col ?? 0);
  return {
    width: Math.max(...cols) - Math.min(...cols) + 1,
    height: Math.max(...rows) - Math.min(...rows) + 1,
  };
}

export function generateGrid(input: WordEntry[]): CrosswordGrid {
  const entries = normalizeEntries(input).sort((a, b) => b.answer.length - a.answer.length);
  if (entries.length === 0) {
    return { width: 0, height: 0, cells: new Map(), placements: [], unplaced: [], score: 0 };
  }

  const cells = new Map<string, GridCell>();
  const first = entries[0]!;
  const placements: Placement[] = [{ ...first, row: 0, col: 0, orientation: 'across' }];
  writePlacement(cells, placements[0]!);
  const unplaced: WordEntry[] = [];

  for (const entry of entries.slice(1)) {
    const candidates = candidatePlacements(cells, entry);
    const best = candidates
      .map((placement) => {
        const trial = cloneCells(cells);
        writePlacement(trial, placement);
        const size = bounds(trial);
        return { placement, area: size.width * size.height };
      })
      .sort((a, b) => a.area - b.area)[0];

    if (!best) {
      unplaced.push(entry);
      continue;
    }
    placements.push(best.placement);
    writePlacement(cells, best.placement);
  }

  const size = bounds(cells);
  const crossings = [...cells.values()].filter((cell) => cell.across && cell.down).length;
  const score = placements.length * 100 + crossings * 20 - size.width * size.height - unplaced.length * 50;

  return { ...size, cells, placements, unplaced, score };
}
