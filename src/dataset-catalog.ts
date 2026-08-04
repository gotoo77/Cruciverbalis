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

  const catalog = document.createElement('section');
  catalog.id = 'dataset-catalog';
  catalog.className = 'dataset-catalog';
  catalog.innerHTML = `
    <div class="dataset-catalog-heading">
      <div>
        <p class="eyebrow">Matériaux reproductibles</p>
        <h3>Catalogue de WordSets</h3>
      </div>
      <button type="button" class="secondary" id="analyze-current-word-set">Analyser la liste courante</button>
    </div>
    <div class="dataset-cards">
      ${WORD_SET_PRESETS.map((preset) => {
        const analysis = analyzeWordSet(preset);
        return `
          <article class="dataset-card">
            <div>
              <span class="dataset-language">${preset.language.toLocaleUpperCase()}</span>
              <h4>${preset.name}</h4>
              <p>${preset.description ?? ''}</p>
            </div>
            <dl>
              <div><dt>Mots</dt><dd>${analysis.entryCount}</dd></div>
              <div><dt>Moyenne</dt><dd>${analysis.averageLength.toFixed(1)}</dd></div>
              <div><dt>Difficulté</dt><dd>${difficultyLabel[analysis.difficulty]}</dd></div>
            </dl>
            <p class="dataset-meta">${preset.author ?? 'Auteur inconnu'} · ${preset.license ?? 'Licence non précisée'}</p>
            <button type="button" class="secondary" data-load-dataset="${preset.id}">Charger</button>
          </article>
        `;
      }).join('')}
    </div>
    <div id="dataset-analysis" class="dataset-analysis" hidden></div>
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
      analysisPanel.innerHTML = `<h4>${preset.name}</h4>${renderAnalysis(preset)}`;
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
