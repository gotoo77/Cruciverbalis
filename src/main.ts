import './style.css';
import { generateGrid } from './core/generate';
import type { CrosswordGrid, WordEntry } from './core/types';

const defaults = `NUCLEAIRE | Énergie issue de transformations du noyau atomique
SOBRIETE | Réduction volontaire de la consommation
ENERGIE | Capacité à produire un travail
URANIUM | Élément utilisé comme combustible nucléaire
DECHET | Résidu dont il faut assurer la gestion
CARBONE | Élément au cœur des émissions de CO₂
RISQUE | Possibilité qu'un événement dommageable survienne
TEMPS | Dimension oubliée des choix techniques`;

function parseEntries(value: string): WordEntry[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [answer = '', clue] = line.split('|').map((part) => part.trim());
      return { answer, clue };
    });
}

function renderGrid(grid: CrosswordGrid): string {
  if (grid.cells.size === 0) return '<p class="empty">Ajoute au moins un mot de deux lettres.</p>';

  const coordinates = [...grid.cells.keys()].map((position) => position.split(',').map(Number));
  const rows = coordinates.map(([row]) => row ?? 0);
  const cols = coordinates.map(([, col]) => col ?? 0);
  const minRow = Math.min(...rows);
  const maxRow = Math.max(...rows);
  const minCol = Math.min(...cols);
  const maxCol = Math.max(...cols);
  const cells: string[] = [];

  for (let row = minRow; row <= maxRow; row += 1) {
    for (let col = minCol; col <= maxCol; col += 1) {
      const cell = grid.cells.get(`${row},${col}`);
      cells.push(cell ? `<div class="cell">${cell.letter}</div>` : '<div class="cell blocked"></div>');
    }
  }

  return `<div class="grid" style="grid-template-columns: repeat(${grid.width}, 2rem)">${cells.join('')}</div>`;
}

function render(): void {
  const app = document.querySelector<HTMLElement>('#app');
  if (!app) throw new Error('Application root not found');

  app.innerHTML = `
    <header>
      <p class="eyebrow">Forge de mots croisés</p>
      <h1>Cruciverbalis</h1>
      <p>Une première tranche déterministe : donne des mots, le moteur tente de les croiser sans inventer de bouche-trou.</p>
    </header>
    <section class="panel">
      <label for="entries">Un mot par ligne, suivi éventuellement de <code>| définition</code></label>
      <textarea id="entries" spellcheck="false">${defaults}</textarea>
      <button id="generate">Générer la grille</button>
    </section>
    <section id="result" class="result"></section>
  `;

  const textarea = document.querySelector<HTMLTextAreaElement>('#entries');
  const result = document.querySelector<HTMLElement>('#result');
  const button = document.querySelector<HTMLButtonElement>('#generate');
  if (!textarea || !result || !button) throw new Error('UI initialization failed');

  const generate = (): void => {
    const grid = generateGrid(parseEntries(textarea.value));
    result.innerHTML = `
      <div class="metrics">
        <span><strong>${grid.placements.length}</strong> placés</span>
        <span><strong>${grid.unplaced.length}</strong> non placés</span>
        <span><strong>${grid.score}</strong> score</span>
      </div>
      ${renderGrid(grid)}
      ${grid.unplaced.length > 0 ? `<p class="warning">Non placés : ${grid.unplaced.map((entry) => entry.answer).join(', ')}</p>` : ''}
    `;
  };

  button.addEventListener('click', generate);
  generate();
}

render();
