import './style.css';
import {
  analyzeParetoFront,
  generate,
  type Entry,
  type GeneratedGrid,
  type GenerationResult,
  type GenerationStrategy,
} from './api';

const defaults = `NUCLEAIRE | Énergie issue de transformations du noyau atomique
SOBRIETE | Réduction volontaire de la consommation
ENERGIE | Capacité à produire un travail
URANIUM | Élément utilisé comme combustible nucléaire
DECHET | Résidu dont il faut assurer la gestion
CARBONE | Élément au cœur des émissions de CO₂
RISQUE | Possibilité qu'un événement dommageable survienne
TEMPS | Dimension oubliée des choix techniques`;

function parseEntries(value: string): Entry[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [answer = '', clue] = line.split('|').map((part) => part.trim());
      return { answer, clue: clue || undefined };
    });
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function bounds(grid: GeneratedGrid['grid']): {
  readonly minRow: number;
  readonly maxRow: number;
  readonly minCol: number;
  readonly maxCol: number;
  readonly width: number;
  readonly height: number;
} | undefined {
  if (grid.cells.size === 0) return undefined;

  const coordinates = [...grid.cells.keys()].map((position) => position.split(',').map(Number));
  const rows = coordinates.map(([row]) => row ?? 0);
  const cols = coordinates.map(([, col]) => col ?? 0);
  const minRow = Math.min(...rows);
  const maxRow = Math.max(...rows);
  const minCol = Math.min(...cols);
  const maxCol = Math.max(...cols);

  return {
    minRow,
    maxRow,
    minCol,
    maxCol,
    width: maxCol - minCol + 1,
    height: maxRow - minRow + 1,
  };
}

function renderGrid(solution: GeneratedGrid): string {
  const frame = bounds(solution.grid);
  if (!frame) return '<p class="empty">Aucune case à afficher.</p>';

  const cells: string[] = [];
  for (let row = frame.minRow; row <= frame.maxRow; row += 1) {
    for (let col = frame.minCol; col <= frame.maxCol; col += 1) {
      const cell = solution.grid.cells.get(`${row},${col}`);
      cells.push(
        cell
          ? `<div class="cell" aria-label="${escapeHtml(cell.letter)}">${escapeHtml(cell.letter)}</div>`
          : '<div class="cell blocked" aria-hidden="true"></div>',
      );
    }
  }

  return `<div class="grid-wrap"><div class="grid" style="grid-template-columns: repeat(${frame.width}, var(--cell-size))">${cells.join('')}</div></div>`;
}

function percentage(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function renderQuality(solution: GeneratedGrid): string {
  const quality = solution.quality;
  return `
    <div class="metric-grid" aria-label="Qualité de la grille">
      <article><span>Placés</span><strong>${quality.placedEntries}</strong></article>
      <article><span>Croisements</span><strong>${quality.crossings}</strong></article>
      <article><span>Aire</span><strong>${quality.area}</strong></article>
      <article><span>Densité</span><strong>${percentage(quality.density)}</strong></article>
      <article><span>Équilibre H/V</span><strong>${percentage(quality.directionBalance)}</strong></article>
    </div>
  `;
}

function renderParetoAnalysis(result: GenerationResult): string {
  if (result.strategy !== 'pareto') return '';

  const analysis = analyzeParetoFront(result.solutions);
  const repeated = analysis.repeatedQualityProfileCount === 0
    ? 'aucun profil de qualité répété'
    : `${analysis.repeatedQualityProfileCount} profil${analysis.repeatedQualityProfileCount > 1 ? 's' : ''} de qualité répété${analysis.repeatedQualityProfileCount > 1 ? 's' : ''}, regroupant ${analysis.solutionsInRepeatedProfiles} solutions`;

  return `
    <div class="pareto-summary">
      <strong>Cartographie du front :</strong>
      ${analysis.solutionCount} solution${analysis.solutionCount > 1 ? 's' : ''},
      ${analysis.qualityProfileCount} profil${analysis.qualityProfileCount > 1 ? 's' : ''} de qualité distinct${analysis.qualityProfileCount > 1 ? 's' : ''},
      ${repeated}.
      <span>Même profil ne signifie pas même grille.</span>
    </div>
  `;
}

function renderSearch(result: GenerationResult): string {
  if (!result.search) return '<p class="search-note">Le solveur glouton ne parcourt pas un arbre de recherche instrumenté.</p>';

  const search = result.search;
  return `
    <details class="search-details">
      <summary>Voir les métriques de recherche</summary>
      <div class="search-grid">
        <span>Nœuds <strong>${search.nodesExplored}</strong></span>
        <span>Placements essayés <strong>${search.placementsTried}</strong></span>
        <span>Backtracks <strong>${search.backtracks}</strong></span>
        <span>Impasses <strong>${search.deadEnds}</strong></span>
        <span>Branches élaguées <strong>${search.branchesPruned}</strong></span>
        <span>Sélections MRV <strong>${search.mrvSelections}</strong></span>
        <span>Solutions terminales <strong>${search.solutionsFound}</strong></span>
        <span>Candidats Pareto <strong>${search.paretoCandidates}</strong></span>
      </div>
    </details>
  `;
}

function renderSolution(result: GenerationResult, index: number): string {
  const solution = result.solutions[index];
  if (!solution) {
    return '<p class="empty">Le solveur n’a produit aucune solution dans le budget demandé.</p>';
  }

  const navigation = result.solutions.length > 1
    ? `<div class="solution-nav">
        <button class="secondary" id="previous-solution" ${index === 0 ? 'disabled' : ''}>← Précédente</button>
        <strong>Solution ${index + 1} / ${result.solutions.length}</strong>
        <button class="secondary" id="next-solution" ${index === result.solutions.length - 1 ? 'disabled' : ''}>Suivante →</button>
      </div>`
    : '';

  const unplaced = solution.unplaced.length > 0
    ? `<p class="warning"><strong>Non placés :</strong> ${solution.unplaced.map((entry) => escapeHtml(entry.answer)).join(', ')}</p>`
    : '<p class="success">Tous les mots admissibles ont été placés.</p>';

  return `
    ${renderParetoAnalysis(result)}
    ${navigation}
    ${renderQuality(solution)}
    ${renderGrid(solution)}
    ${unplaced}
    ${result.truncated ? '<p class="warning"><strong>Recherche tronquée :</strong> le budget de nœuds a été atteint.</p>' : ''}
    ${renderSearch(result)}
  `;
}

function render(): void {
  const app = document.querySelector<HTMLElement>('#app');
  if (!app) throw new Error('Application root not found');

  app.innerHTML = `
    <header class="hero">
      <p class="eyebrow">Laboratoire de mots croisés</p>
      <h1>Cruciverbalis</h1>
      <p class="lede">Donne des mots au moteur, choisis sa stratégie et observe les compromis entre complétude, croisements, compacité et coût de recherche.</p>
    </header>

    <section class="panel controls" aria-labelledby="controls-title">
      <div>
        <h2 id="controls-title">Entrées</h2>
        <p class="hint">Un mot par ligne, suivi éventuellement de <code>| définition</code>.</p>
      </div>
      <textarea id="entries" spellcheck="false" aria-label="Mots à placer">${defaults}</textarea>
      <div class="control-row">
        <label>
          <span>Stratégie</span>
          <select id="strategy">
            <option value="greedy">Glouton</option>
            <option value="backtracking" selected>Backtracking + MRV + B&amp;B</option>
            <option value="pareto">Front de Pareto</option>
          </select>
        </label>
        <label>
          <span>Budget de recherche</span>
          <select id="max-nodes">
            <option value="10000">10 000 nœuds</option>
            <option value="50000" selected>50 000 nœuds</option>
            <option value="100000">100 000 nœuds</option>
          </select>
        </label>
      </div>
      <button id="generate">Générer</button>
    </section>

    <section class="panel result" aria-live="polite">
      <div class="result-heading">
        <div>
          <p class="eyebrow">Résultat</p>
          <h2 id="result-title">Grille générée</h2>
        </div>
        <span id="strategy-badge" class="badge"></span>
      </div>
      <div id="result"></div>
    </section>

    <footer>
      <p>V0 interactive — tout le calcul s’effectue localement dans ton navigateur, sans backend.</p>
    </footer>
  `;

  const textarea = document.querySelector<HTMLTextAreaElement>('#entries');
  const resultElement = document.querySelector<HTMLElement>('#result');
  const button = document.querySelector<HTMLButtonElement>('#generate');
  const strategyElement = document.querySelector<HTMLSelectElement>('#strategy');
  const maxNodesElement = document.querySelector<HTMLSelectElement>('#max-nodes');
  const badge = document.querySelector<HTMLElement>('#strategy-badge');
  if (!textarea || !resultElement || !button || !strategyElement || !maxNodesElement || !badge) {
    throw new Error('UI initialization failed');
  }

  let currentResult: GenerationResult | undefined;
  let solutionIndex = 0;

  const strategyLabel = (strategy: GenerationStrategy): string => ({
    greedy: 'Glouton',
    backtracking: 'Backtracking',
    pareto: 'Pareto',
  })[strategy];

  const paintSolution = (): void => {
    if (!currentResult) return;
    resultElement.innerHTML = renderSolution(currentResult, solutionIndex);
    badge.textContent = strategyLabel(currentResult.strategy);

    document.querySelector<HTMLButtonElement>('#previous-solution')?.addEventListener('click', () => {
      solutionIndex = Math.max(0, solutionIndex - 1);
      paintSolution();
    });
    document.querySelector<HTMLButtonElement>('#next-solution')?.addEventListener('click', () => {
      solutionIndex = Math.min(currentResult!.solutions.length - 1, solutionIndex + 1);
      paintSolution();
    });
  };

  const run = (): void => {
    const entries = parseEntries(textarea.value);
    const strategy = strategyElement.value as GenerationStrategy;
    const maxNodes = Number(maxNodesElement.value);

    button.disabled = true;
    button.textContent = 'Calcul…';

    window.setTimeout(() => {
      currentResult = generate({ entries, strategy, maxNodes });
      solutionIndex = 0;
      paintSolution();
      button.disabled = false;
      button.textContent = 'Générer';
    }, 0);
  };

  button.addEventListener('click', run);
  run();
}

render();
