import {
  fillSeedGrid,
  generate,
  importLexique4Tsv,
  lexiconToCandidates,
  type GeneratedGrid,
  type GenerationStrategy,
  type Lexicon,
  type Placement,
} from './api';

let currentLexicon: Lexicon | undefined;

function selectedSolutionIndex(): number {
  const label = document.querySelector<HTMLElement>('.solution-nav strong')?.textContent ?? '';
  const match = /Solution\s+(\d+)\s*\//i.exec(label);
  return match ? Math.max(0, Number(match[1]) - 1) : 0;
}

function currentGeneratedSolution(): GeneratedGrid | undefined {
  const textarea = document.querySelector<HTMLTextAreaElement>('#entries');
  const strategy = document.querySelector<HTMLSelectElement>('#strategy');
  const maxNodes = document.querySelector<HTMLSelectElement>('#max-nodes');
  if (!textarea || !strategy || !maxNodes) return undefined;

  const entries = textarea.value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [answer = '', clue] = line.split('|').map((part) => part.trim());
      return { answer, clue: clue || undefined };
    });

  const result = generate({
    entries,
    strategy: strategy.value as GenerationStrategy,
    maxNodes: Number(maxNodes.value),
  });
  return result.solutions[selectedSolutionIndex()] ?? result.solutions[0];
}

function placementCells(placement: Placement): string[] {
  return [...placement.entry.answer].map((_, offset) => {
    const row = placement.start.row + (placement.direction === 'down' ? offset : 0);
    const col = placement.start.col + (placement.direction === 'across' ? offset : 0);
    return `${row},${col}`;
  });
}

function renderFilledGrid(solution: GeneratedGrid, filled: readonly Placement[], grid: GeneratedGrid['grid']): string {
  if (grid.cells.size === 0) return '<p class="search-note">Aucune case à afficher.</p>';
  const coordinates = [...grid.cells.keys()].map((key) => key.split(',').map(Number));
  const rows = coordinates.map(([row]) => row ?? 0);
  const cols = coordinates.map(([, col]) => col ?? 0);
  const minRow = Math.min(...rows); const maxRow = Math.max(...rows);
  const minCol = Math.min(...cols); const maxCol = Math.max(...cols);
  const fillCells = new Set(filled.flatMap(placementCells));
  const seedCells = new Set(solution.grid.cells.keys());
  const cells: string[] = [];

  for (let row = minRow; row <= maxRow; row += 1) {
    for (let col = minCol; col <= maxCol; col += 1) {
      const key = `${row},${col}`;
      const cell = grid.cells.get(key);
      if (!cell) {
        cells.push('<span class="fill-cell blocked" aria-hidden="true"></span>');
        continue;
      }
      const origin = fillCells.has(key) && !seedCells.has(key) ? ' filler' : ' seed';
      cells.push(`<span class="fill-cell${origin}" title="${origin === ' filler' ? 'Ajout FillPass' : 'Mot thématique'}">${cell.letter}</span>`);
    }
  }

  return `<div class="fill-grid-wrap"><div class="fill-grid" style="grid-template-columns:repeat(${maxCol - minCol + 1},var(--fill-cell-size))">${cells.join('')}</div></div>`;
}

function installFillPassPlayground(): void {
  const resultSection = document.querySelector<HTMLElement>('#result-section');
  if (!resultSection || document.querySelector('#fillpass-playground')) return;

  const section = document.createElement('details');
  section.id = 'fillpass-playground';
  section.className = 'fillpass-playground';
  section.innerHTML = `
    <summary class="fillpass-summary">
      <span><span class="eyebrow">Complétude</span><strong>Compléter la grille avec Lexique 4</strong></span>
      <span class="playable-schema">FillPass</span>
    </summary>
    <div class="fillpass-content">
      <p class="search-note">La grille générée reste la charpente thématique. Charge le fichier texte tabulé fourni par Lexique 4 (.txt ou .tsv) puis demande au FillPass de compléter les ponts compatibles sans modifier les mots du thème. L’extension du fichier n’a pas d’importance : c’est la présence des colonnes tabulées, notamment <code>ortho</code>, qui compte.</p>
      <div class="fillpass-actions">
        <button type="button" id="import-lexique4">Charger un fichier Lexique 4 (.txt / .tsv)</button>
        <button type="button" class="secondary" id="run-fillpass" disabled>Compléter la grille courante</button>
      </div>
      <input id="lexique4-file" type="file" accept=".txt,.tsv,text/plain,text/tab-separated-values" hidden />
      <p id="fillpass-status" class="search-note" aria-live="polite">Aucun lexique chargé.</p>
      <div id="fillpass-result"></div>
    </div>`;
  resultSection.after(section);

  const importButton = section.querySelector<HTMLButtonElement>('#import-lexique4');
  const runButton = section.querySelector<HTMLButtonElement>('#run-fillpass');
  const fileInput = section.querySelector<HTMLInputElement>('#lexique4-file');
  const status = section.querySelector<HTMLElement>('#fillpass-status');
  const output = section.querySelector<HTMLElement>('#fillpass-result');
  if (!importButton || !runButton || !fileInput || !status || !output) return;

  importButton.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    status.textContent = `Lecture de ${file.name}…`;
    const imported = importLexique4Tsv(await file.text());
    if (!imported.ok) {
      currentLexicon = undefined;
      runButton.disabled = true;
      output.innerHTML = '';
      status.textContent = `Import refusé — ${imported.issues.map(({ message }) => message).join(' · ')}`;
      return;
    }
    currentLexicon = imported.value;
    runButton.disabled = false;
    status.textContent = `${file.name} chargé comme ${imported.value.name} : ${imported.value.entries.length.toLocaleString('fr-FR')} entrées exploitables${imported.issues.length ? ` · ${imported.issues.length} avertissement(s)` : ''}.`;
    fileInput.value = '';
  });

  runButton.addEventListener('click', () => {
    if (!currentLexicon) return;
    const solution = currentGeneratedSolution();
    if (!solution) {
      status.textContent = 'Aucune solution générée à compléter.';
      output.innerHTML = '';
      return;
    }

    status.textContent = 'Recherche de remplissage en cours…';
    const result = fillSeedGrid(solution.grid, lexiconToCandidates(currentLexicon));
    const words = result.filled.map(({ entry }) => entry.answer);
    output.innerHTML = `
      <div class="fillpass-stats">
        <span>Slots détectés <strong>${result.stats.slotsDetected}</strong></span>
        <span>Slots remplis <strong>${result.stats.slotsFilled}</strong></span>
        <span>Nœuds <strong>${result.stats.nodesExplored}</strong></span>
        <span>Backtracks <strong>${result.stats.backtracks}</strong></span>
        <span>Score lexical <strong>${result.stats.lexicalScore.toFixed(1)}</strong></span>
      </div>
      ${renderFilledGrid(solution, result.filled, result.grid)}
      <p class="fillpass-legend"><span><i class="seed"></i> mots thématiques</span><span><i class="filler"></i> remplissage lexical</span></p>
      <p class="search-note">${words.length ? `Ajouts : ${words.join(', ')}.` : 'Aucun remplissage compatible trouvé avec les slots prudents du FillPass actuel.'}</p>`;
    status.textContent = result.truncated
      ? `Remplissage terminé avec budget atteint : ${result.stats.slotsFilled}/${result.stats.slotsDetected} slots.`
      : `Remplissage terminé : ${result.stats.slotsFilled}/${result.stats.slotsDetected} slots.`;
  });
}

const observer = new MutationObserver(installFillPassPlayground);
observer.observe(document.documentElement, { childList: true, subtree: true });
installFillPassPlayground();
