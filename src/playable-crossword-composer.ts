import {
  cluesForAnswer,
  composePlayableCrossword,
  generate,
  serializePlayableCrossword,
  type ClueSelection,
  type GeneratedGrid,
  type GenerationStrategy,
  type PlayableCrossword,
} from './api';
import { getCurrentClueSet } from './clue-set-playground';

let preparedSolution: GeneratedGrid | undefined;
let composedCrossword: PlayableCrossword | undefined;

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

function downloadCrossword(crossword: PlayableCrossword): void {
  const blob = new Blob([serializePlayableCrossword(crossword)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${crossword.id}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function renderClueChoices(container: HTMLElement, solution: GeneratedGrid): void {
  const clueSet = getCurrentClueSet();
  if (!clueSet) {
    container.innerHTML = '<p class="warning">Charge d’abord un ClueSet dans la section « Explorer les indices ».</p>';
    return;
  }

  const rows = solution.grid.placements.map((placement) => {
    const answer = placement.entry.answer;
    const candidates = cluesForAnswer(clueSet, answer);
    if (candidates.length === 0) {
      return `<div class="playable-choice missing"><strong>${answer}</strong><span>Aucun indice disponible dans ${clueSet.name}.</span></div>`;
    }
    if (candidates.length === 1) {
      const clue = candidates[0]!;
      return `<div class="playable-choice"><strong>${answer}</strong><span class="clue-kind">${clue.kind}</span><span>${clue.text}</span><small>Sélection automatique : un seul indice disponible.</small></div>`;
    }
    return `<label class="playable-choice"><strong>${answer}</strong><span>${candidates.length} indices disponibles — choix éditorial requis</span><select data-clue-answer="${answer}">
      <option value="">Choisir un indice…</option>
      ${candidates.map((clue) => `<option value="${clue.id}">[${clue.kind}] ${clue.text}</option>`).join('')}
    </select></label>`;
  });

  container.innerHTML = rows.join('');
}

function installPlayableComposer(): void {
  const clueSection = document.querySelector<HTMLElement>('#clue-set-playground');
  if (!clueSection || document.querySelector('#playable-crossword-composer')) return;

  const section = document.createElement('details');
  section.id = 'playable-crossword-composer';
  section.className = 'playable-crossword-composer';
  section.innerHTML = `
    <summary class="playable-composer-summary">
      <span><span class="eyebrow">Publication</span><strong>Composer et exporter une grille jouable</strong></span>
      <span class="playable-schema">PlayableCrossword v1</span>
    </summary>
    <div class="playable-composer-content">
      <p class="search-note">Assemble la solution actuellement affichée avec le ClueSet chargé, puis exporte un fichier JSON directement réimportable dans « Jouer une grille ».</p>
      <div class="playable-meta">
        <label><span>Identifiant</span><input id="playable-id" value="crossword-demo-v1" /></label>
        <label><span>Nom</span><input id="playable-name" value="Grille Cruciverbalis" /></label>
      </div>
      <div class="playable-actions" aria-label="Étapes de publication">
        <button type="button" id="prepare-playable">1. Préparer les indices</button>
        <button type="button" class="secondary" id="compose-playable" disabled>2. Composer la grille jouable</button>
        <button type="button" class="secondary" id="export-playable" disabled>3. Exporter en JSON</button>
      </div>
      <p id="playable-status" class="search-note" aria-live="polite">Charge un ClueSet puis prépare la solution courante.</p>
      <div id="playable-clue-choices" class="playable-clue-choices"></div>
      <div id="playable-preview" class="playable-preview" hidden></div>
    </div>
  `;
  clueSection.after(section);

  const prepare = section.querySelector<HTMLButtonElement>('#prepare-playable');
  const compose = section.querySelector<HTMLButtonElement>('#compose-playable');
  const exportButton = section.querySelector<HTMLButtonElement>('#export-playable');
  const status = section.querySelector<HTMLElement>('#playable-status');
  const choices = section.querySelector<HTMLElement>('#playable-clue-choices');
  const preview = section.querySelector<HTMLElement>('#playable-preview');
  const idInput = section.querySelector<HTMLInputElement>('#playable-id');
  const nameInput = section.querySelector<HTMLInputElement>('#playable-name');
  if (!prepare || !compose || !exportButton || !status || !choices || !preview || !idInput || !nameInput) return;

  const exportCurrentCrossword = (): void => {
    if (!composedCrossword) return;
    downloadCrossword(composedCrossword);
    status.textContent = `${composedCrossword.name} exporté en JSON. Ce fichier peut être importé directement dans « Jouer une grille ».`;
  };

  prepare.addEventListener('click', () => {
    composedCrossword = undefined;
    exportButton.disabled = true;
    preview.hidden = true;
    preparedSolution = currentGeneratedSolution();
    if (!preparedSolution) {
      choices.innerHTML = '';
      compose.disabled = true;
      status.textContent = 'Aucune solution générée à composer.';
      return;
    }
    const clueSet = getCurrentClueSet();
    renderClueChoices(choices, preparedSolution);
    compose.disabled = !clueSet;
    status.textContent = clueSet
      ? `${preparedSolution.grid.placements.length} entrées à composer avec « ${clueSet.name} ».`
      : 'Charge d’abord un ClueSet.';
  });

  compose.addEventListener('click', () => {
    const clueSet = getCurrentClueSet();
    if (!preparedSolution || !clueSet) return;
    const selections: ClueSelection[] = [...section.querySelectorAll<HTMLSelectElement>('[data-clue-answer]')]
      .filter((select) => select.value)
      .map((select) => ({ answer: select.dataset.clueAnswer ?? '', clueId: select.value }));

    const result = composePlayableCrossword(preparedSolution.grid, clueSet, {
      id: idInput.value.trim(),
      name: nameInput.value.trim(),
      clueSelections: selections,
    });
    if (!result.ok) {
      composedCrossword = undefined;
      exportButton.disabled = true;
      preview.hidden = true;
      status.textContent = `Composition incomplète — ${result.issues.map(({ message }) => message).join(' · ')}`;
      return;
    }

    composedCrossword = result.value;
    exportButton.disabled = false;
    status.textContent = `${result.value.name} est prête : ${result.value.entries.length} entrées et leurs indices sont figés.`;
    preview.hidden = false;
    preview.innerHTML = `
      <div class="playable-preview-copy">
        <strong>Grille jouable prête à exporter</strong>
        <span>${result.value.schema}</span>
        <span>ClueSet : ${result.value.clueSetId}</span>
        <span>${result.value.entries.length} entrées jouables</span>
        <p>Le JSON produit est le format attendu par la section « Jouer une grille ».</p>
      </div>
      <button type="button" class="playable-export-cta" id="export-playable-ready">Exporter cette grille en JSON</button>
    `;
    preview.querySelector<HTMLButtonElement>('#export-playable-ready')?.addEventListener('click', exportCurrentCrossword);
  });

  exportButton.addEventListener('click', exportCurrentCrossword);
}

const observer = new MutationObserver(() => installPlayableComposer());
observer.observe(document.documentElement, { childList: true, subtree: true });
installPlayableComposer();
