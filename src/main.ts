import './style.css';
import {
  analyzeParetoFront,
  analyzeParetoMorphology,
  analyzeParetoMorphologyDiscriminants,
  createHumanComparisonArtifact,
  createHumanComparisonVote,
  createSameQualityComparisonPairs,
  generate,
  measureGridMorphology,
  type Entry,
  type GeneratedGrid,
  type GenerationResult,
  type GenerationStrategy,
  type HumanComparisonDecision,
  type HumanComparisonPair,
  type HumanComparisonVote,
  type MorphologyMetric,
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
  return value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => {
    const [answer = '', clue] = line.split('|').map((part) => part.trim());
    return { answer, clue: clue || undefined };
  });
}

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function bounds(grid: GeneratedGrid['grid']) {
  if (grid.cells.size === 0) return undefined;
  const coordinates = [...grid.cells.keys()].map((position) => position.split(',').map(Number));
  const rows = coordinates.map(([row]) => row ?? 0);
  const cols = coordinates.map(([, col]) => col ?? 0);
  const minRow = Math.min(...rows); const maxRow = Math.max(...rows);
  const minCol = Math.min(...cols); const maxCol = Math.max(...cols);
  return { minRow, maxRow, minCol, maxCol, width: maxCol - minCol + 1, height: maxRow - minRow + 1 };
}

function renderGrid(solution: GeneratedGrid): string {
  const frame = bounds(solution.grid);
  if (!frame) return '<p class="empty">Aucune case à afficher.</p>';
  const cells: string[] = [];
  for (let row = frame.minRow; row <= frame.maxRow; row += 1) {
    for (let col = frame.minCol; col <= frame.maxCol; col += 1) {
      const cell = solution.grid.cells.get(`${row},${col}`);
      cells.push(cell ? `<div class="cell" aria-label="${escapeHtml(cell.letter)}">${escapeHtml(cell.letter)}</div>` : '<div class="cell blocked" aria-hidden="true"></div>');
    }
  }
  return `<div class="grid-wrap"><div class="grid" style="grid-template-columns: repeat(${frame.width}, var(--cell-size))">${cells.join('')}</div></div>`;
}

const percentage = (value: number): string => `${Math.round(value * 100)}%`;

function renderQuality(solution: GeneratedGrid): string {
  const q = solution.quality;
  return `<div class="metric-grid" aria-label="Qualité de la grille">
    <article><span>Placés</span><strong>${q.placedEntries}</strong></article><article><span>Croisements</span><strong>${q.crossings}</strong></article>
    <article><span>Aire</span><strong>${q.area}</strong></article><article><span>Densité</span><strong>${percentage(q.density)}</strong></article>
    <article><span>Équilibre H/V</span><strong>${percentage(q.directionBalance)}</strong></article></div>`;
}

function renderMorphology(solution: GeneratedGrid): string {
  const m = measureGridMorphology(solution.grid);
  return `<details class="morphology-details"><summary>Morphologie descriptive</summary><div class="search-grid">
    <span>Dimensions <strong>${m.width} × ${m.height}</strong></span><span>Ratio d’aspect <strong>${m.aspectRatio.toFixed(2)}</strong></span>
    <span>Bords exposés <strong>${m.exposedEdges}</strong></span><span>Entrées feuilles <strong>${m.leafEntries}</strong></span>
    <span>Degré max <strong>${m.maxEntryDegree}</strong></span><span>Diamètre graphe <strong>${m.graphDiameter}</strong></span></div>
    <p class="search-note">Ces métriques décrivent la forme ; elles ne participent pas encore à la dominance de Pareto.</p></details>`;
}

const morphologyMetricLabel = (metric: MorphologyMetric): string => ({ width: 'largeur', height: 'hauteur', aspectRatio: 'ratio d’aspect', exposedEdges: 'bords exposés', leafEntries: 'entrées feuilles', maxEntryDegree: 'degré maximal', graphDiameter: 'diamètre du graphe' })[metric];

function renderParetoAnalysis(result: GenerationResult): string {
  if (result.strategy !== 'pareto') return '';
  const quality = analyzeParetoFront(result.solutions);
  const morphology = analyzeParetoMorphology(result.solutions);
  const discrimination = analyzeParetoMorphologyDiscriminants(result.solutions);
  const repeated = quality.repeatedQualityProfileCount === 0 ? 'aucun profil de qualité répété' : `${quality.repeatedQualityProfileCount} profil(s) de qualité répété(s), regroupant ${quality.solutionsInRepeatedProfiles} solutions`;
  const leaders = discrimination.discriminants.filter(({ varyingQualityFamilies }) => varyingQualityFamilies > 0).slice(0, 3)
    .map(({ metric, varyingQualityFamilies, repeatedQualityFamilies }) => `${morphologyMetricLabel(metric)} (${varyingQualityFamilies}/${repeatedQualityFamilies})`).join(', ');
  return `<details class="analysis-details"><summary>Analyse du front de Pareto</summary><div class="pareto-summary">
    <strong>Cartographie :</strong> ${quality.solutionCount} solution(s), ${quality.qualityProfileCount} profil(s) de qualité, ${repeated}.
    <span>${morphology.morphologyProfileCount} profil(s) morphologique(s) ; ${morphology.qualityProfilesSplitByMorphology} profil(s) de qualité se divisent en plusieurs formes.</span>
    <span>${discrimination.repeatedQualityFamiliesSplitByAnyMorphologyMetric}/${discrimination.repeatedQualityFamilyCount} famille(s) répétée(s) distinguées par au moins une métrique${leaders ? ` ; principales dimensions : ${leaders}` : ''}.</span>
  </div></details>`;
}

function renderSearch(result: GenerationResult): string {
  if (!result.search) return '<details class="search-details"><summary>Observatoire de recherche</summary><p class="search-note">Le solveur glouton ne parcourt pas un arbre de recherche instrumenté.</p></details>';
  const s = result.search;
  return `<details class="search-details"><summary>Observatoire de recherche · MRV / B&amp;B</summary><div class="search-grid">
    <span>Nœuds <strong>${s.nodesExplored}</strong></span><span>Placements essayés <strong>${s.placementsTried}</strong></span><span>Backtracks <strong>${s.backtracks}</strong></span>
    <span>Impasses <strong>${s.deadEnds}</strong></span><span>Branches élaguées <strong>${s.branchesPruned}</strong></span><span>Sélections MRV <strong>${s.mrvSelections}</strong></span>
    <span>Solutions terminales <strong>${s.solutionsFound}</strong></span><span>Candidats Pareto <strong>${s.paretoCandidates}</strong></span></div></details>`;
}

function renderComparisonCandidate(solution: GeneratedGrid, label: string, solutionNumber: number): string {
  const m = measureGridMorphology(solution.grid);
  return `<article class="comparison-candidate"><div class="comparison-title"><strong>${label}</strong><span>solution ${solutionNumber}</span></div>${renderGrid(solution)}
    <div class="comparison-morphology"><span>${m.width}×${m.height}</span><span>aspect ${m.aspectRatio.toFixed(2)}</span><span>${m.leafEntries} feuilles</span><span>diamètre ${m.graphDiameter}</span></div></article>`;
}

function renderHumanComparison(result: GenerationResult, pairs: readonly HumanComparisonPair<GeneratedGrid>[], pairIndex: number, votes: readonly HumanComparisonVote[]): string {
  if (result.strategy !== 'pareto') return '';
  if (pairs.length === 0) return '<details class="analysis-details"><summary>Comparaison humaine</summary><p class="search-note">Aucune paire de même qualité mais de morphologie différente dans ce front.</p></details>';
  const pair = pairs[pairIndex];
  if (!pair) return `<details class="analysis-details"><summary>Comparaison humaine terminée</summary><p>${votes.length} jugement(s) enregistré(s) localement.</p><button id="export-comparisons" class="secondary">Exporter les jugements JSON</button></details>`;
  return `<details class="analysis-details"><summary>Comparaison humaine · ${pairIndex + 1} / ${pairs.length}</summary><section class="human-comparison" aria-labelledby="comparison-title">
    <h3 id="comparison-title">À qualité mesurée égale, laquelle préfères-tu ?</h3><p class="search-note">Ton choix sert à observer une préférence que nos métriques ne capturent peut-être pas.</p>
    <div class="comparison-grid">${renderComparisonCandidate(pair.left, 'A', pair.leftIndex + 1)}${renderComparisonCandidate(pair.right, 'B', pair.rightIndex + 1)}</div>
    <div class="comparison-actions"><button data-comparison-decision="left">Je préfère A</button><button data-comparison-decision="right">Je préfère B</button><button class="secondary" data-comparison-decision="tie">Équivalentes</button><button class="secondary" data-comparison-decision="skip">Je ne sais pas</button></div>
  </section></details>`;
}

function renderSolution(result: GenerationResult, index: number, comparisonPairs: readonly HumanComparisonPair<GeneratedGrid>[], comparisonIndex: number, comparisonVotes: readonly HumanComparisonVote[]): string {
  const solution = result.solutions[index];
  if (!solution) return '<p class="empty">Le solveur n’a produit aucune solution dans le budget demandé.</p>';
  const navigation = result.solutions.length > 1 ? `<div class="solution-nav"><button class="secondary" id="previous-solution" ${index === 0 ? 'disabled' : ''}>← Précédente</button><strong>Solution ${index + 1} / ${result.solutions.length}</strong><button class="secondary" id="next-solution" ${index === result.solutions.length - 1 ? 'disabled' : ''}>Suivante →</button></div>` : '';
  const unplaced = solution.unplaced.length > 0 ? `<p class="warning"><strong>Non placés :</strong> ${solution.unplaced.map((entry) => escapeHtml(entry.answer)).join(', ')}</p>` : '<p class="success">Tous les mots admissibles ont été placés.</p>';
  return `${navigation}${renderQuality(solution)}${renderGrid(solution)}${unplaced}${result.truncated ? '<p class="warning"><strong>Recherche tronquée :</strong> budget de nœuds atteint.</p>' : ''}${renderParetoAnalysis(result)}${renderMorphology(solution)}${renderSearch(result)}${renderHumanComparison(result, comparisonPairs, comparisonIndex, comparisonVotes)}`;
}

function downloadJson(filename: string, value: unknown): void {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; anchor.click(); URL.revokeObjectURL(url);
}

function render(): void {
  const app = document.querySelector<HTMLElement>('#app');
  if (!app) throw new Error('Application root not found');
  app.innerHTML = `<a class="skip-link" href="#main-content">Aller au contenu</a>
    <header class="topbar"><div class="topbar-inner"><a class="brand" href="#top" aria-label="Cruciverbalis, accueil">Cruciverbalis</a>
      <nav id="primary-nav" class="topnav" aria-label="Navigation principale" data-open="false"><a href="#generate-section">Générer</a><a href="#result-section">Résultat</a><a href="#result-section">Observatoire</a></nav>
      <div class="nav-actions"><button id="theme-toggle" class="icon-button" type="button" aria-label="Passer au thème clair" title="Changer de thème">☀</button>
      <button id="menu-toggle" class="icon-button menu-toggle" type="button" aria-controls="primary-nav" aria-expanded="false" aria-label="Ouvrir le menu">☰</button></div></div></header>
    <main id="main-content"><header id="top" class="hero"><p class="eyebrow">Laboratoire de mots croisés</p><h1>Cruciverbalis</h1><p class="lede">Construis une grille, puis ouvre seulement les analyses dont tu as besoin.</p></header>
      <div class="workspace"><section id="generate-section" class="panel controls" aria-labelledby="controls-title"><div><h2 id="controls-title">Génération</h2><p class="hint">Un mot par ligne, suivi éventuellement de <code>| définition</code>.</p></div>
        <textarea id="entries" spellcheck="false" aria-label="Mots à placer">${defaults}</textarea><div class="control-row"><label><span>Stratégie</span><select id="strategy"><option value="greedy">Glouton</option><option value="backtracking" selected>Backtracking + MRV + B&amp;B</option><option value="pareto">Front de Pareto</option></select></label>
        <label><span>Budget de recherche</span><select id="max-nodes"><option value="10000">10 000 nœuds</option><option value="50000" selected>50 000 nœuds</option><option value="100000">100 000 nœuds</option></select></label></div><button id="generate">Générer</button></section>
        <section id="result-section" class="panel result" aria-live="polite" aria-labelledby="result-title"><div class="result-heading"><div><p class="eyebrow">Résultat</p><h2 id="result-title">Grille générée</h2></div><span id="strategy-badge" class="badge"></span></div><div id="result"></div></section></div>
      <footer><p>Tout le calcul s’effectue localement dans ton navigateur, sans backend.</p></footer></main>`;

  const textarea = document.querySelector<HTMLTextAreaElement>('#entries'); const resultElement = document.querySelector<HTMLElement>('#result');
  const button = document.querySelector<HTMLButtonElement>('#generate'); const strategyElement = document.querySelector<HTMLSelectElement>('#strategy');
  const maxNodesElement = document.querySelector<HTMLSelectElement>('#max-nodes'); const badge = document.querySelector<HTMLElement>('#strategy-badge');
  const themeToggle = document.querySelector<HTMLButtonElement>('#theme-toggle'); const menuToggle = document.querySelector<HTMLButtonElement>('#menu-toggle'); const nav = document.querySelector<HTMLElement>('#primary-nav');
  if (!textarea || !resultElement || !button || !strategyElement || !maxNodesElement || !badge || !themeToggle || !menuToggle || !nav) throw new Error('UI initialization failed');

  const savedTheme = localStorage.getItem('cruciverbalis-theme');
  const setTheme = (theme: 'dark' | 'light'): void => {
    document.documentElement.dataset.theme = theme; localStorage.setItem('cruciverbalis-theme', theme);
    themeToggle.textContent = theme === 'dark' ? '☀' : '☾'; themeToggle.setAttribute('aria-label', theme === 'dark' ? 'Passer au thème clair' : 'Passer au thème sombre');
  };
  setTheme(savedTheme === 'light' ? 'light' : 'dark');
  themeToggle.addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'light' ? 'dark' : 'light'));

  const setMenu = (open: boolean): void => { nav.dataset.open = String(open); menuToggle.setAttribute('aria-expanded', String(open)); menuToggle.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu'); };
  menuToggle.addEventListener('click', () => setMenu(nav.dataset.open !== 'true'));
  nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && nav.dataset.open === 'true') { setMenu(false); menuToggle.focus(); } });

  let currentResult: GenerationResult | undefined; let solutionIndex = 0; let comparisonPairs: readonly HumanComparisonPair<GeneratedGrid>[] = []; let comparisonIndex = 0; let comparisonVotes: HumanComparisonVote[] = [];
  const strategyLabel = (strategy: GenerationStrategy): string => ({ greedy: 'Glouton', backtracking: 'Backtracking', pareto: 'Pareto' })[strategy];
  const paintSolution = (): void => {
    if (!currentResult) return; resultElement.innerHTML = renderSolution(currentResult, solutionIndex, comparisonPairs, comparisonIndex, comparisonVotes); badge.textContent = strategyLabel(currentResult.strategy);
    document.querySelector<HTMLButtonElement>('#previous-solution')?.addEventListener('click', () => { solutionIndex = Math.max(0, solutionIndex - 1); paintSolution(); });
    document.querySelector<HTMLButtonElement>('#next-solution')?.addEventListener('click', () => { solutionIndex = Math.min(currentResult!.solutions.length - 1, solutionIndex + 1); paintSolution(); });
    document.querySelectorAll<HTMLButtonElement>('[data-comparison-decision]').forEach((comparisonButton) => comparisonButton.addEventListener('click', () => { const pair = comparisonPairs[comparisonIndex]; if (!pair) return; const decision = comparisonButton.dataset.comparisonDecision as HumanComparisonDecision; comparisonVotes = [...comparisonVotes, createHumanComparisonVote(pair, comparisonIndex, decision)]; comparisonIndex += 1; paintSolution(); }));
    document.querySelector<HTMLButtonElement>('#export-comparisons')?.addEventListener('click', () => downloadJson('cruciverbalis-human-comparisons.json', createHumanComparisonArtifact(comparisonVotes, new Date().toISOString())));
  };
  const run = (): void => { const entries = parseEntries(textarea.value); const strategy = strategyElement.value as GenerationStrategy; const maxNodes = Number(maxNodesElement.value); button.disabled = true; button.textContent = 'Calcul…'; window.setTimeout(() => { currentResult = generate({ entries, strategy, maxNodes }); solutionIndex = 0; comparisonPairs = currentResult.strategy === 'pareto' ? createSameQualityComparisonPairs(currentResult.solutions, 12) : []; comparisonIndex = 0; comparisonVotes = []; paintSolution(); button.disabled = false; button.textContent = 'Générer'; }, 0); };
  button.addEventListener('click', run); run();
}

render();
