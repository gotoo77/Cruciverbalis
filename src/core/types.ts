export type Orientation = 'across' | 'down';

export interface WordEntry {
  answer: string;
  clue?: string;
  theme?: string;
}

export interface Placement {
  answer: string;
  clue?: string;
  theme?: string;
  row: number;
  col: number;
  orientation: Orientation;
}

export interface GridCell {
  letter: string;
  across: boolean;
  down: boolean;
}

export interface CrosswordGrid {
  width: number;
  height: number;
  cells: Map<string, GridCell>;
  placements: Placement[];
  unplaced: WordEntry[];
  score: number;
}
