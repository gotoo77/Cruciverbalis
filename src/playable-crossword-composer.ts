import {
  analyzeGridClueCoverage,
  classifyPlayableEntries,
  cluesForAnswer,
  composePlayableCrosswordFromArtifacts,
  generate,
  preflightPlayablePublication,
  serializePlayableCrossword,
  type ClueSelection,
  type GeneratedGrid,
  type GenerationStrategy,
  type PlayableCrossword,
  type WordSet,
} from './api';
import { getCurrentClueSet } from './clue-set-playground';
import { getCurrentWordSet } from './word-set-playground';

let preparedSolution: GeneratedGrid | undefined;
let preparedWordSet: WordSet | undefined;
let composedCrossword: PlayableCrossword | undefined;

function selectedSolutionIndex(): number { const label = document.querySelector<HTMLElement>('.solution-nav strong')?.textContent ?? ''; const match = /Solution\s+(\d+)\s*\//i.exec(label); return match ? Math.max(0, Number(match[1]) - 1) : 0; }
function currentGeneratedSolution(): GeneratedGrid | undefined {
  const textarea = document.querySelector<HTMLTextAreaElement>('#entries'); const strategy = document.querySelector<HTMLSelectElement>('#strategy'); const maxNodes = document.querySelector<HTMLSelectElement>('#max-nodes'); if (!textarea || !strategy || !maxNodes) return undefined;
  const entries = textarea.value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => { const [answer = '', clue] = line.split('|').map((part) => part.trim()); return { answer, clue: clue || undefined }; });
  const result = generate({ entries, strategy: strategy.value as GenerationStrategy, maxNodes: Number(maxNodes.value) }); return result.solutions[selectedSolutionIndex()] ?? result.solutions[0];
}
function downloadCrossword(crossword: PlayableCrossword): void { const blob = new Blob([serializePlayableCrossword(crossword)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${crossword.id}.json`; anchor.click(); URL.revokeObjectURL(url); }
function renderClueChoices(container: HTMLElement, solution: GeneratedGrid): void {
  const clueSet = getCurrentClueSet(); if (!clueSet) { container.innerHTML = '<p class="warning">Charge d’abord un ClueSet dans la section « Explorer les indices ».</p>'; return; }
  container.innerHTML = solution.grid.placements.map((placement) => { const answer = placement.entry.answer; const candidates = cluesForAnswer(clueSet, answer); if (candidates.length === 0) return `<div class="playable-choice missing"><strong>${answer}</strong><span>Aucun indice disponible dans ${clueSet.name}.</span></div>`; if (candidates.length === 1) { const clue = candidates[0]!; return `<div class="playable-choice"><strong>${answer}</strong><span class="clue-kind">${clue.kind}</span><span>${clue.text}</span><small>Sélection automatique : un seul indice disponible.</small></div>`; } return `<label class="playable-choice"><strong>${answer}</strong><span>${candidates.length} indices disponibles — choix éditorial requis</span><select data-clue-answer="${answer}"><option value="">Choisir un indice…</option>${candidates.map((clue) => `<option value="${clue.id}">[${clue.kind}] ${clue.text}</option>`).join('')}</select></label>`; }).join('');
}
function renderEditorialInspection(crossword: PlayableCrossword, wordSet: WordSet): string {
  const roles = classifyPlayableEntries(crossword, wordSet); const total = roles.thematicCount + roles.fillCount;
  const rows = roles.entries.map(({ entry, role }) => `<li class="editorial-entry" data-role="${role}"><strong>${entry.answer}</strong><span>${role === 'thematic' ? 'Thématique' : 'Remplissage'}</span><small>${entry.clue.text}</small></li>`).join('');
  return `<details class="editorial-inspection"><summary><span>Inspection éditoriale</span><strong>${total} entrées · ${roles.thematicCount} thématiques · ${roles.fillCount} remplissage</strong></summary><div class="editorial-inspection-content"><p class="search-note">Cette classification vient du WordSet : les mots absents du corpus thématique sont identifiés comme remplissage.</p><ul class="editorial-entry-list">${rows}</ul></div></details>`;
}
function installPlayableComposer(): void {
  const clueSection = document.querySelector<HTMLElement>('#clue-set-playground'); if (!clueSection || document.querySelector('#playable-crossword-composer')) return;
  const section = document.createElement('details'); section.id = 'playable-crossword-composer'; section.className = 'playable-crossword-composer';
  section.innerHTML = `<summary class="playable-composer-summary"><span><span class="eyebrow">Publication</span><strong>Composer et exporter une grille jouable</strong></span><span class="playable-schema">PlayableCrossword v1</span></summary><div class="playable-composer-content"><p class="search-note">Assemble la solution affichée avec le WordSet courant et le ClueSet chargé, puis inspecte le rôle des entrées avant export.</p><div class="playable-meta"><label><span>Identifiant</span><input id="playable-id" value="crossword-demo-v1" /></label><label><span>Nom</span><input id="playable-name" value="Grille Cruciverbalis" /></label></div><div class="playable-actions"><button type="button" id="prepare-playable">1. Préparer les indices</button><button type="button" class="secondary" id="compose-playable" disabled>2. Composer la grille jouable</button><button type="button" class="secondary" id="export-playable" disabled>3. Exporter en JSON</button></div><p id="playable-status" class="search-note" aria-live="polite">Charge un ClueSet puis prépare la solution courante.</p><div id="playable-clue-choices" class="playable-clue-choices"></div><div id="playable-preview" class="playable-preview" hidden></div></div>`;
  clueSection.after(section);
  const prepare = section.querySelector<HTMLButtonElement>('#prepare-playable'); const compose = section.querySelector<HTMLButtonElement>('#compose-playable'); const exportButton = section.querySelector<HTMLButtonElement>('#export-playable'); const status = section.querySelector<HTMLElement>('#playable-status'); const choices = section.querySelector<HTMLElement>('#playable-clue-choices'); const preview = section.querySelector<HTMLElement>('#playable-preview'); const idInput = section.querySelector<HTMLInputElement>('#playable-id'); const nameInput = section.querySelector<HTMLInputElement>('#playable-name'); if (!prepare || !compose || !exportButton || !status || !choices || !preview || !idInput || !nameInput) return;
  const exportCurrentCrossword = (): void => {
    if (!composedCrossword) return;
    const clueSet = getCurrentClueSet();
    if (!clueSet) {
      exportButton.disabled = true;
      status.textContent = 'Export bloqué — le ClueSet utilisé pour la publication n’est plus chargé.';
      return;
    }
    const preflight = preflightPlayablePublication(composedCrossword, clueSet);
    if (!preflight.publishable) {
      exportButton.disabled = true;
      status.textContent = `Export bloqué — ${preflight.issues.map(({ message }) => message).join(' · ')}`;
      return;
    }
    downloadCrossword(composedCrossword);
    status.textContent = `${composedCrossword.name} exporté en JSON.`;
  };
  prepare.addEventListener('click', () => {
    composedCrossword = undefined;
    exportButton.disabled = true;
    preview.hidden = true;
    preparedSolution = currentGeneratedSolution();
    preparedWordSet = getCurrentWordSet();
    if (!preparedSolution || !preparedWordSet) {
      choices.innerHTML = '';
      compose.disabled = true;
      status.textContent = 'Aucune solution ou WordSet courant à composer.';
      return;
    }
    const clueSet = getCurrentClueSet();
    renderClueChoices(choices, preparedSolution);
    if (!clueSet) {
      compose.disabled = true;
      status.textContent = 'Charge d’abord un ClueSet.';
      return;
    }
    const coverage = analyzeGridClueCoverage(preparedSolution.grid, clueSet);
    compose.disabled = !coverage.complete;
    status.textContent = coverage.complete
      ? `${preparedSolution.grid.placements.length} entrées couvertes par « ${clueSet.name} » — composition possible.`
      : `Composition bloquée — indices manquants pour : ${coverage.missingAnswers.join(', ')}.`;
  });
  compose.addEventListener('click', () => { const clueSet = getCurrentClueSet(); if (!preparedSolution || !preparedWordSet || !clueSet) return; const selections: ClueSelection[] = [...section.querySelectorAll<HTMLSelectElement>('[data-clue-answer]')].filter((select) => select.value).map((select) => ({ answer: select.dataset.clueAnswer ?? '', clueId: select.value })); const result = composePlayableCrosswordFromArtifacts(preparedSolution.grid, preparedWordSet, clueSet, { id: idInput.value.trim(), name: nameInput.value.trim(), clueSelections: selections }); if (!result.ok) { composedCrossword = undefined; exportButton.disabled = true; preview.hidden = true; status.textContent = `Composition incomplète — ${result.issues.map(({ message }) => message).join(' · ')}`; return; } const preflight = preflightPlayablePublication(result.value, clueSet); if (!preflight.publishable) { composedCrossword = undefined; exportButton.disabled = true; preview.hidden = true; status.textContent = `Publication bloquée — ${preflight.issues.map(({ message }) => message).join(' · ')}`; return; } composedCrossword = result.value; exportButton.disabled = false; const roles = classifyPlayableEntries(result.value, preparedWordSet); status.textContent = `${result.value.name} prête : ${roles.thematicCount} mots thématiques, ${roles.fillCount} de remplissage.`; preview.hidden = false; preview.innerHTML = `<div class="playable-preview-copy"><strong>Grille jouable prête à exporter</strong><span>${result.value.schema}</span><span>WordSet : ${result.value.wordSetId}</span><span>ClueSet : ${result.value.clueSetId}</span></div>${renderEditorialInspection(result.value, preparedWordSet)}<button type="button" class="playable-export-cta" id="export-playable-ready">Exporter cette grille en JSON</button>`; preview.querySelector<HTMLButtonElement>('#export-playable-ready')?.addEventListener('click', exportCurrentCrossword); });
  exportButton.addEventListener('click', exportCurrentCrossword);
}
const observer = new MutationObserver(() => installPlayableComposer()); observer.observe(document.documentElement, { childList: true, subtree: true }); installPlayableComposer();
