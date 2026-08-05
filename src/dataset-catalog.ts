import {
  WORD_SET_PRESETS,
  WORD_SET_SCHEMA,
  analyzeWordSet,
  type WordSet,
} from './api';

const difficultyLabel = {
  easy: 'Facile',
  medium: 'Intermédiaire',
  hard: 'Difficile',
} as const;

function answersFromTextarea(textarea: HTMLTextAreaElement): readonly string[] {
  return textarea.value
    .split(/\r?\n/)
    .map((line) => (line.split('|')[0] ?? '').trim())
    .filter(Boolean);
}

function draftFromTextarea(textarea: HTMLTextAreaElement): WordSet {
  return {
    schema: WORD_SET_SCHEMA,
    id: 'browser-draft',
    name: 'Liste courante',
    language: 'fr',
    entries: answersFromTextarea(textarea).map((answer) => ({ answer })),
  };
}

function renderAnalysis(wordSet: WordSet): string {
  const analysis = analyzeWordSet(wordSet);
  const isolated = analysis.isolatedEntries.length === 0
    ? 'aucun mot isolé détecté'
    : `${analysis.isolatedEntries.length} mot${analysis.isolatedEntries.length > 1 ? 's' : ''} potentiellement isolé${analysis.isolatedEntries.length > 1 ? 's' : ''}`;
  const rare = analysis.rareLetters.length === 0 ? 'aucune' : analysis.rareLetters.join(', ');

  return `
    <div class="dataset-analysis-grid">
      <span>Mots <strong>${analysis.entryCount}</strong></span>
      <span>Longueur moyenne <strong>${analysis.averageLength.toFixed(1)}</strong></span>
      <span>Amplitude <strong>${analysis.minLength}–${analysis.maxLength}</strong></span>
      <span>Alphabet <strong>${analysis.uniqueLetters.length} lettres</strong></span>
      <span>Lettres rares <strong>${rare}</strong></span>
      <span>Connexions moyennes <strong>${analysis.averageSharedLetters.toFixed(1)}</strong></span>
    </div>
    <p class="search-note"><strong>Difficulté heuristique : ${difficultyLabel[analysis.difficulty]}.</strong> ${isolated}. Cette estimation décrit le matériau ; elle ne garantit pas le coût réel du solveur.</p>
  `;
}

function installDatasetCatalog(): void {
  const textarea = document.querySelector<HTMLTextAreaElement>('#entries');
  if (!textarea || document.querySelector('#dataset-catalog')) return;

  const catalog = document.createElement('details');
  catalog.id = 'dataset-catalog';
  catalog.className = 'dataset-catalog';
  catalog.innerHTML = `
    <summary class="dataset-catalog-summary">
      <span>
        <span class="eyebrow">Matériaux reproductibles</span>
        <strong>WordSets disponibles</strong>
      </span>
      <span class="dataset-count">${WORD_SET_PRESETS.length} preset${WORD_SET_PRESETS.length > 1 ? 's' : ''}</span>
    </summary>
    <div class="dataset-catalog-content">
      <div class="dataset-catalog-heading">
        <div>
          <h3>Catalogue de WordSets</h3>
          <p class="search-note">Choisis un corpus pour remplacer la liste éditable, ou analyse directement ta liste courante.</p>
        </div>
        <button type="button" class="secondary" id="analyze-current-word-set">Analyser la liste courante</button>
      </div>
      <div class="dataset-cards">
        ${WORD_SET_PRESETS.map((preset) => {
          const analysis = analyzeWordSet(preset);
          return `
            <button type="button" class="dataset-card" data-load-dataset="${preset.id}" aria-label="Charger le WordSet ${preset.name}">
              <span class="dataset-card-copy">
                <span class="dataset-language">${preset.language.toLocaleUpperCase()}</span>
                <strong class="dataset-card-title">${preset.name}</strong>
                <span class="dataset-description">${preset.description ?? ''}</span>
              </span>
              <span class="dataset-stats" aria-hidden="true">
                <span>Mots <strong>${analysis.entryCount}</strong></span>
                <span>Moyenne <strong>${analysis.averageLength.toFixed(1)}</strong></span>
                <span>Difficulté <strong>${difficultyLabel[analysis.difficulty]}</strong></span>
              </span>
              <span class="dataset-meta">${preset.author ?? 'Auteur inconnu'} · ${preset.license ?? 'Licence non précisée'}</span>
              <span class="dataset-load-hint" aria-hidden="true">Charger ce WordSet →</span>
            </button>
          `;
        }).join('')}
      </div>
      <div id="dataset-analysis" class="dataset-analysis" hidden></div>
    </div>
  `;

  const tools = document.querySelector('#word-set-tools');
  if (tools) tools.before(catalog);
  else textarea.before(catalog);

  const analysisPanel = catalog.querySelector<HTMLElement>('#dataset-analysis');
  const analyzeButton = catalog.querySelector<HTMLButtonElement>('#analyze-current-word-set');
  if (!analysisPanel || !analyzeButton) return;

  catalog.querySelectorAll<HTMLButtonElement>('[data-load-dataset]').forEach((button) => {
    button.addEventListener('click', () => {
      const preset = WORD_SET_PRESETS.find(({ id }) => id === button.dataset.loadDataset);
      if (!preset) return;
      textarea.value = preset.entries.map(({ answer }) => answer).join('\n');
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      analysisPanel.hidden = false;
      analysisPanel.innerHTML = `<h4>${preset.name} chargé</h4>${renderAnalysis(preset)}`;
      if (window.matchMedia('(max-width: 760px)').matches) catalog.open = false;
      textarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  });

  analyzeButton.addEventListener('click', () => {
    const draft = draftFromTextarea(textarea);
    analysisPanel.hidden = false;
    analysisPanel.innerHTML = draft.entries.length === 0
      ? '<p class="warning">Ajoute au moins un mot avant l’analyse.</p>'
      : `<h4>Analyse de la liste courante</h4>${renderAnalysis(draft)}`;
  });
}

const observer = new MutationObserver(() => installDatasetCatalog());
observer.observe(document.documentElement, { childList: true, subtree: true });
installDatasetCatalog();
