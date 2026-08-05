import { CLUE_KINDS, parseClueSetJson, serializeClueSet, type ClueKind, type ClueSet } from './artifacts/clue-set';
import { CLUE_SET_PRESETS } from './artifacts/clue-set-presets';

let currentClueSet: ClueSet | undefined;

export function getCurrentClueSet(): ClueSet | undefined {
  return currentClueSet;
}

function renderIssues(issues: readonly { path: string; message: string }[]): string {
  return issues.map(({ path, message }) => `${path} : ${message}`).join(' · ');
}

function downloadClueSet(clueSet: ClueSet): void {
  const blob = new Blob([serializeClueSet(clueSet)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${clueSet.id}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function renderClues(container: HTMLElement, clueSet: ClueSet, kind: ClueKind | 'all'): void {
  const clues = kind === 'all' ? clueSet.clues : clueSet.clues.filter((clue) => clue.kind === kind);
  const grouped = new Map<string, typeof clues>();
  for (const clue of clues) grouped.set(clue.answer, [...(grouped.get(clue.answer) ?? []), clue]);

  if (grouped.size === 0) {
    container.innerHTML = '<p class="empty">Aucun indice ne correspond à ce filtre.</p>';
    return;
  }

  container.innerHTML = [...grouped.entries()].map(([answer, answerClues]) => `
    <article class="clue-answer-card">
      <header><strong>${answer}</strong><span>${answerClues.length} indice${answerClues.length > 1 ? 's' : ''}</span></header>
      <div class="clue-list">${answerClues.map((clue) => `
        <div class="clue-item"><span class="clue-kind">${clue.kind}</span><p>${clue.text}</p>${clue.difficulty ? `<small>Difficulté ${clue.difficulty}/5</small>` : ''}</div>
      `).join('')}</div>
    </article>
  `).join('');
}

function installClueSetPlayground(): void {
  const controls = document.querySelector<HTMLElement>('.controls');
  if (!controls || document.querySelector('#clue-set-playground')) return;

  const section = document.createElement('details');
  section.id = 'clue-set-playground';
  section.className = 'clue-set-playground';
  section.innerHTML = `
    <summary class="clue-set-summary">
      <span><span class="eyebrow">ClueSet</span><strong>Explorer les indices</strong></span>
      <span class="clue-set-summary-meta">${CLUE_SET_PRESETS.length} preset${CLUE_SET_PRESETS.length > 1 ? 's' : ''}</span>
    </summary>
    <div class="clue-set-content">
      <p class="search-note">Les indices restent séparés des mots et de la géométrie de la grille.</p>
      <div class="clue-set-toolbar">
        <label><span>Jeu d’indices</span><select id="clue-set-preset"><option value="">Choisir un preset</option>${CLUE_SET_PRESETS.map((preset) => `<option value="${preset.id}">${preset.name}</option>`).join('')}</select></label>
        <label><span>Type d’indice</span><select id="clue-kind-filter"><option value="all">Tous</option>${CLUE_KINDS.map((kind) => `<option value="${kind}">${kind}</option>`).join('')}</select></label>
        <div class="clue-set-actions"><button type="button" class="secondary" id="import-clue-set">Importer JSON</button><button type="button" class="secondary" id="export-clue-set" disabled>Exporter JSON</button></div>
      </div>
      <input id="clue-set-file" type="file" accept="application/json,.json" hidden />
      <p id="clue-set-status" class="search-note" aria-live="polite">Charge un preset ou importe un artefact cruciverbalis.clue-set.v1.</p>
      <div id="clue-set-results" class="clue-set-results"></div>
    </div>
  `;

  controls.after(section);

  const preset = section.querySelector<HTMLSelectElement>('#clue-set-preset');
  const kind = section.querySelector<HTMLSelectElement>('#clue-kind-filter');
  const importButton = section.querySelector<HTMLButtonElement>('#import-clue-set');
  const exportButton = section.querySelector<HTMLButtonElement>('#export-clue-set');
  const fileInput = section.querySelector<HTMLInputElement>('#clue-set-file');
  const status = section.querySelector<HTMLElement>('#clue-set-status');
  const results = section.querySelector<HTMLElement>('#clue-set-results');
  if (!preset || !kind || !importButton || !exportButton || !fileInput || !status || !results) return;

  const refresh = () => {
    if (!currentClueSet) {
      results.innerHTML = '';
      exportButton.disabled = true;
      return;
    }
    exportButton.disabled = false;
    renderClues(results, currentClueSet, kind.value as ClueKind | 'all');
  };

  preset.addEventListener('change', () => {
    currentClueSet = CLUE_SET_PRESETS.find(({ id }) => id === preset.value);
    if (!currentClueSet) return refresh();
    status.textContent = `${currentClueSet.name} chargé : ${currentClueSet.clues.length} indices pour ${new Set(currentClueSet.clues.map(({ answer }) => answer)).size} réponses.`;
    refresh();
  });

  kind.addEventListener('change', refresh);
  importButton.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    const parsed = parseClueSetJson(await file.text());
    if (!parsed.ok) {
      status.textContent = `Import refusé — ${renderIssues(parsed.issues)}`;
      fileInput.value = '';
      return;
    }
    currentClueSet = parsed.value;
    preset.value = CLUE_SET_PRESETS.some(({ id }) => id === parsed.value.id) ? parsed.value.id : '';
    status.textContent = `${parsed.value.name} importé : ${parsed.value.clues.length} indices valides.`;
    fileInput.value = '';
    refresh();
  });

  exportButton.addEventListener('click', () => {
    if (!currentClueSet) return;
    downloadClueSet(currentClueSet);
    status.textContent = `${currentClueSet.name} exporté comme artefact cruciverbalis.clue-set.v1.`;
  });
}

const observer = new MutationObserver(() => installClueSetPlayground());
observer.observe(document.documentElement, { childList: true, subtree: true });
installClueSetPlayground();
