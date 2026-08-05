import './style.css';
import {
  SOLVE_FEEDBACK_SCHEMA,
  parsePlayableCrosswordJson,
  serializeSolveFeedback,
  type PlayableCrossword,
  type PlayableEntry,
  type SolveFeedback,
} from './api';

const cellKey = (row: number, col: number): string => `${row},${col}`;

function entryCells(entry: PlayableEntry): { row: number; col: number; letter: string }[] {
  return [...entry.answer].map((letter, index) => ({
    row: entry.row + (entry.direction === 'down' ? index : 0),
    col: entry.col + (entry.direction === 'across' ? index : 0),
    letter,
  }));
}

function downloadFeedback(feedback: SolveFeedback): void {
  const blob = new Blob([serializeSolveFeedback(feedback)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${feedback.crosswordId}-solve-feedback.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function renderPlayer(container: HTMLElement, crossword: PlayableCrossword): void {
  const startedAt = performance.now();
  let checks = 0;
  let solved = false;
  const cells = new Map<string, { row: number; col: number; letter: string }>();
  crossword.entries.flatMap(entryCells).forEach((cell) => cells.set(cellKey(cell.row, cell.col), cell));
  const values = [...cells.values()];
  const minRow = Math.min(...values.map(({ row }) => row));
  const maxRow = Math.max(...values.map(({ row }) => row));
  const minCol = Math.min(...values.map(({ col }) => col));
  const maxCol = Math.max(...values.map(({ col }) => col));
  const starts = new Map<string, number>();
  [...crossword.entries]
    .sort((a, b) => a.row - b.row || a.col - b.col)
    .forEach((entry) => {
      const key = cellKey(entry.row, entry.col);
      if (!starts.has(key)) starts.set(key, starts.size + 1);
    });

  const grid: string[] = [];
  for (let row = minRow; row <= maxRow; row += 1) {
    for (let col = minCol; col <= maxCol; col += 1) {
      const cell = cells.get(cellKey(row, col));
      if (!cell) {
        grid.push('<span class="player-cell blocked" aria-hidden="true"></span>');
        continue;
      }
      const number = starts.get(cellKey(row, col));
      grid.push(`<label class="player-cell">${number ? `<small>${number}</small>` : ''}<input maxlength="1" autocomplete="off" autocapitalize="characters" data-answer="${cell.letter}" aria-label="Case ${row}, ${col}" /></label>`);
    }
  }

  const clues = crossword.entries
    .map((entry) => `<li><strong>${starts.get(cellKey(entry.row, entry.col)) ?? ''} ${entry.direction === 'across' ? '→' : '↓'}</strong> ${entry.clue.text} <span class="clue-kind">${entry.clue.kind}</span></li>`)
    .join('');

  container.innerHTML = `<article class="playable-crossword-player standalone-player"><div class="player-heading"><div><p class="eyebrow">${crossword.schema}</p><h2>${crossword.name}</h2></div><button type="button" class="secondary" id="check-player">Vérifier</button></div><div class="player-layout"><div class="player-grid-wrap"><div class="player-grid" style="grid-template-columns:repeat(${maxCol - minCol + 1},var(--player-cell-size))">${grid.join('')}</div></div><ol class="player-clues">${clues}</ol></div><p id="player-feedback" class="search-note" aria-live="polite">Remplis la grille puis vérifie tes réponses.</p><details class="solve-feedback-panel"><summary>Retour après résolution</summary><div class="solve-feedback-fields"><label>Difficulté ressentie<select id="solve-difficulty"><option value="">Non notée</option>${[1, 2, 3, 4, 5].map((n) => `<option value="${n}">${n}/5</option>`).join('')}</select></label><label>Plaisir de résolution<select id="solve-enjoyment"><option value="">Non noté</option>${[1, 2, 3, 4, 5].map((n) => `<option value="${n}">${n}/5</option>`).join('')}</select></label><label class="solve-feedback-note">Commentaire<textarea id="solve-note" rows="3" placeholder="Trop dur, définition brillante, passage frustrant…"></textarea></label></div><button type="button" class="secondary" id="export-solve-feedback">Exporter le retour JSON</button><p class="search-note">Artefact ${SOLVE_FEEDBACK_SCHEMA} : temps, vérifications, réussite et appréciation humaine.</p></details></article>`;

  container.querySelectorAll<HTMLInputElement>('.player-cell input').forEach((input) => {
    input.addEventListener('input', () => {
      input.value = input.value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toUpperCase().slice(-1);
      input.classList.remove('correct', 'incorrect');
    });
  });

  container.querySelector<HTMLButtonElement>('#check-player')?.addEventListener('click', () => {
    checks += 1;
    const inputs = [...container.querySelectorAll<HTMLInputElement>('.player-cell input')];
    let correct = 0;
    let filled = 0;
    inputs.forEach((input) => {
      const value = input.value.toUpperCase();
      const ok = value === input.dataset.answer;
      if (value) filled += 1;
      if (ok) correct += 1;
      input.classList.toggle('correct', ok);
      input.classList.toggle('incorrect', Boolean(value) && !ok);
    });
    solved = correct === inputs.length;
    const feedback = container.querySelector<HTMLElement>('#player-feedback');
    if (feedback) feedback.textContent = solved ? 'Grille résolue !' : `${correct}/${inputs.length} lettres correctes · ${filled}/${inputs.length} cases remplies.`;
  });

  container.querySelector<HTMLButtonElement>('#export-solve-feedback')?.addEventListener('click', () => {
    const difficulty = Number(container.querySelector<HTMLSelectElement>('#solve-difficulty')?.value || 0) || undefined;
    const enjoyment = Number(container.querySelector<HTMLSelectElement>('#solve-enjoyment')?.value || 0) || undefined;
    const note = container.querySelector<HTMLTextAreaElement>('#solve-note')?.value.trim() || undefined;
    downloadFeedback({
      schema: SOLVE_FEEDBACK_SCHEMA,
      crosswordId: crossword.id,
      solved,
      checks,
      elapsedMs: Math.round(performance.now() - startedAt),
      difficulty: difficulty as 1 | 2 | 3 | 4 | 5 | undefined,
      enjoyment: enjoyment as 1 | 2 | 3 | 4 | 5 | undefined,
      note,
    });
  });
}

const fileInput = document.querySelector<HTMLInputElement>('#playable-file');
const importButton = document.querySelector<HTMLButtonElement>('#import-playable');
const dropzone = document.querySelector<HTMLElement>('#player-dropzone');
const status = document.querySelector<HTMLElement>('#player-import-status');
const board = document.querySelector<HTMLElement>('#player-board');

function loadJson(json: string, source: string): void {
  if (!status || !board) return;
  const parsed = parsePlayableCrosswordJson(json);
  if (!parsed.ok) {
    status.textContent = `Import refusé — ${parsed.issues.map(({ path, message }) => `${path}: ${message}`).join(' · ')}`;
    board.innerHTML = '';
    return;
  }
  status.textContent = `${parsed.value.name} chargée depuis ${source} · ${parsed.value.entries.length} entrées.`;
  renderPlayer(board, parsed.value);
}

async function loadFile(file: File): Promise<void> {
  loadJson(await file.text(), file.name);
  if (fileInput) fileInput.value = '';
}

importButton?.addEventListener('click', () => fileInput?.click());
fileInput?.addEventListener('change', async () => {
  const file = fileInput.files?.[0];
  if (file) await loadFile(file);
});

dropzone?.addEventListener('dragover', (event) => {
  event.preventDefault();
  dropzone.classList.add('dragging');
});
dropzone?.addEventListener('dragleave', () => dropzone.classList.remove('dragging'));
dropzone?.addEventListener('drop', async (event) => {
  event.preventDefault();
  dropzone.classList.remove('dragging');
  const file = event.dataTransfer?.files[0];
  if (file) await loadFile(file);
});

const puzzleId = new URLSearchParams(location.search).get('id');
if (puzzleId && status && board) {
  if (!/^[a-z0-9][a-z0-9-]*$/i.test(puzzleId)) {
    status.textContent = 'Identifiant de grille invalide.';
  } else {
    status.textContent = `Chargement de ${puzzleId}…`;
    fetch(`${import.meta.env.BASE_URL}puzzles/${encodeURIComponent(puzzleId)}.json`)
      .then(async (response) => {
        if (!response.ok) throw new Error(`grille introuvable (${response.status})`);
        loadJson(await response.text(), puzzleId);
      })
      .catch((error: unknown) => {
        status.textContent = `Chargement impossible — ${error instanceof Error ? error.message : 'erreur inconnue'}.`;
        board.innerHTML = '';
      });
  }
}
