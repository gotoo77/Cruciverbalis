import { parsePlayableCrosswordJson, type PlayableCrossword, type PlayableEntry } from './api';

function cellKey(row: number, col: number): string { return `${row},${col}`; }

function entryCells(entry: PlayableEntry): { row: number; col: number; letter: string }[] {
  return [...entry.answer].map((letter, index) => ({ row: entry.row + (entry.direction === 'down' ? index : 0), col: entry.col + (entry.direction === 'across' ? index : 0), letter }));
}

function renderPlayer(container: HTMLElement, crossword: PlayableCrossword): void {
  const cells = new Map<string, { row: number; col: number; letter: string }>();
  crossword.entries.flatMap(entryCells).forEach((cell) => cells.set(cellKey(cell.row, cell.col), cell));
  const values = [...cells.values()];
  const minRow = Math.min(...values.map(({ row }) => row)); const maxRow = Math.max(...values.map(({ row }) => row));
  const minCol = Math.min(...values.map(({ col }) => col)); const maxCol = Math.max(...values.map(({ col }) => col));
  const starts = new Map<string, number>();
  [...crossword.entries].sort((a, b) => a.row - b.row || a.col - b.col).forEach((entry) => {
    const key = cellKey(entry.row, entry.col); if (!starts.has(key)) starts.set(key, starts.size + 1);
  });
  const grid: string[] = [];
  for (let row = minRow; row <= maxRow; row += 1) for (let col = minCol; col <= maxCol; col += 1) {
    const cell = cells.get(cellKey(row, col));
    if (!cell) { grid.push('<span class="player-cell blocked" aria-hidden="true"></span>'); continue; }
    const number = starts.get(cellKey(row, col));
    grid.push(`<label class="player-cell">${number ? `<small>${number}</small>` : ''}<input maxlength="1" autocomplete="off" autocapitalize="characters" data-answer="${cell.letter}" aria-label="Case ${row}, ${col}" /></label>`);
  }
  const clues = crossword.entries.map((entry) => `<li><strong>${starts.get(cellKey(entry.row, entry.col)) ?? ''} ${entry.direction === 'across' ? '→' : '↓'}</strong> ${entry.clue.text} <span class="clue-kind">${entry.clue.kind}</span></li>`).join('');
  container.innerHTML = `<div class="player-heading"><div><p class="eyebrow">${crossword.schema}</p><h3>${crossword.name}</h3></div><button type="button" class="secondary" id="check-player">Vérifier</button></div><div class="player-layout"><div class="player-grid-wrap"><div class="player-grid" style="grid-template-columns:repeat(${maxCol - minCol + 1},var(--player-cell-size))">${grid.join('')}</div></div><ol class="player-clues">${clues}</ol></div><p id="player-feedback" class="search-note" aria-live="polite">Remplis la grille puis vérifie tes réponses.</p>`;
  container.querySelectorAll<HTMLInputElement>('.player-cell input').forEach((input) => input.addEventListener('input', () => { input.value = input.value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toUpperCase().slice(-1); input.classList.remove('correct', 'incorrect'); }));
  container.querySelector<HTMLButtonElement>('#check-player')?.addEventListener('click', () => {
    const inputs = [...container.querySelectorAll<HTMLInputElement>('.player-cell input')]; let correct = 0; let filled = 0;
    inputs.forEach((input) => { const value = input.value.toUpperCase(); const ok = value === input.dataset.answer; if (value) filled += 1; if (ok) correct += 1; input.classList.toggle('correct', ok); input.classList.toggle('incorrect', Boolean(value) && !ok); });
    const feedback = container.querySelector<HTMLElement>('#player-feedback'); if (feedback) feedback.textContent = correct === inputs.length ? 'Grille résolue !' : `${correct}/${inputs.length} lettres correctes · ${filled}/${inputs.length} cases remplies.`;
  });
}

function installPlayer(): void {
  const composer = document.querySelector<HTMLElement>('#playable-crossword-composer');
  if (!composer || document.querySelector('#playable-crossword-player')) return;
  const section = document.createElement('details'); section.id = 'playable-crossword-player'; section.className = 'playable-crossword-player';
  section.innerHTML = `<summary class="player-summary"><span><span class="eyebrow">Jeu</span><strong>Jouer une grille</strong></span><span class="playable-schema">PlayableCrossword v1</span></summary><div class="player-content"><p class="search-note">Importe un artefact publié pour le résoudre sans afficher ses réponses.</p><div class="playable-actions"><button type="button" id="import-playable">Importer une grille JSON</button></div><input id="playable-file" type="file" accept="application/json,.json" hidden /><p id="player-import-status" class="search-note" aria-live="polite">Aucune grille chargée.</p><div id="player-board"></div></div>`;
  composer.after(section);
  const button = section.querySelector<HTMLButtonElement>('#import-playable'); const file = section.querySelector<HTMLInputElement>('#playable-file'); const status = section.querySelector<HTMLElement>('#player-import-status'); const board = section.querySelector<HTMLElement>('#player-board'); if (!button || !file || !status || !board) return;
  button.addEventListener('click', () => file.click()); file.addEventListener('change', async () => { const selected = file.files?.[0]; if (!selected) return; const parsed = parsePlayableCrosswordJson(await selected.text()); if (!parsed.ok) { status.textContent = `Import refusé — ${parsed.issues.map(({ path, message }) => `${path}: ${message}`).join(' · ')}`; board.innerHTML = ''; return; } status.textContent = `${parsed.value.name} chargée · ${parsed.value.entries.length} entrées.`; renderPlayer(board, parsed.value); section.open = true; file.value = ''; });
}

const observer = new MutationObserver(installPlayer); observer.observe(document.documentElement, { childList: true, subtree: true }); installPlayer();
