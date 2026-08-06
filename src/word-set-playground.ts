import {
  WORD_SET_PRESETS,
  WORD_SET_SCHEMA,
  analyzeWordSet,
  parseWordSetJson,
  serializeWordSet,
  type SearchComplexity,
  type WordSet,
  type WordSetEntry,
} from './api';

function textareaToWordSet(textarea: HTMLTextAreaElement): WordSet {
  const entries: WordSetEntry[] = textarea.value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => ({ answer: (line.split('|')[0] ?? '').trim() }))
    .filter(({ answer }) => answer.length > 0);

  const presetId = document.querySelector<HTMLSelectElement>('#word-set-preset')?.value;
  const preset = WORD_SET_PRESETS.find(({ id }) => id === presetId);
  if (preset && preset.entries.map(({ answer }) => answer).join('\n') === entries.map(({ answer }) => answer).join('\n')) return preset;

  return {
    schema: WORD_SET_SCHEMA,
    id: 'browser-draft',
    name: 'WordSet édité dans le playground',
    language: 'fr',
    entries,
    provenance: {
      createdBy: 'cruciverbalis.github-pages',
      createdAt: new Date().toISOString(),
    },
  };
}

export function getCurrentWordSet(): WordSet | undefined {
  const textarea = document.querySelector<HTMLTextAreaElement>('#entries');
  return textarea ? textareaToWordSet(textarea) : undefined;
}

function wordSetToTextarea(wordSet: WordSet): string {
  return wordSet.entries.map(({ answer }) => answer).join('\n');
}

function downloadWordSet(wordSet: WordSet): void {
  const blob = new Blob([serializeWordSet(wordSet)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${wordSet.id || 'word-set'}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function renderIssues(issues: readonly { path: string; message: string }[]): string {
  return issues.map(({ path, message }) => `${path} : ${message}`).join(' · ');
}

const complexityLabels: Record<SearchComplexity, string> = {
  low: 'Faible', moderate: 'Modérée', high: 'Élevée', experimental: 'Expérimentale',
};

function renderDiagnostic(textarea: HTMLTextAreaElement, container: HTMLElement): void {
  const analysis = analyzeWordSet(textareaToWordSet(textarea));
  const percentage = Math.round(analysis.connectivityRatio * 100);
  const tone = analysis.estimatedComplexity === 'low' ? 'success' : analysis.estimatedComplexity === 'moderate' ? 'moderate' : 'warning';
  container.dataset.tone = tone;
  container.innerHTML = `<div class="word-set-diagnostic-heading"><div><span class="eyebrow">Prédiagnostic de recherche</span><strong>${complexityLabels[analysis.estimatedComplexity]}</strong></div><span class="word-set-complexity">${analysis.entryCount} mot${analysis.entryCount > 1 ? 's' : ''}</span></div><div class="word-set-diagnostic-grid"><span><small>Connectivité</small><strong>${percentage}%</strong></span><span><small>Composante principale</small><strong>${analysis.largestComponentSize}/${analysis.entryCount}</strong></span><span><small>Mots isolés</small><strong>${analysis.isolatedEntries.length}</strong></span><span><small>Budget conseillé</small><strong>${analysis.recommendedMaxNodes.toLocaleString('fr-FR')} nœuds</strong></span></div>${analysis.warnings.length > 0 ? `<ul class="word-set-warnings">${analysis.warnings.map((warning) => `<li>${warning}</li>`).join('')}</ul>` : '<p class="word-set-diagnostic-note">Corpus dans la zone interactive recommandée et lexicalement connexe.</p>'}${analysis.isolatedEntries.length > 0 ? `<p class="word-set-diagnostic-note"><strong>Isolés :</strong> ${analysis.isolatedEntries.join(', ')}</p>` : ''}`;
}

function installWordSetPlayground(): void {
  const textarea = document.querySelector<HTMLTextAreaElement>('#entries');
  if (!textarea || document.querySelector('#word-set-tools')) return;
  const tools = document.createElement('section');
  tools.id = 'word-set-tools'; tools.className = 'word-set-tools';
  tools.innerHTML = `<div class="word-set-toolbar"><label><span>Jeu de mots</span><select id="word-set-preset" aria-label="Preset WordSet"><option value="">Liste personnalisée</option>${WORD_SET_PRESETS.map((preset) => `<option value="${preset.id}">${preset.name}</option>`).join('')}</select></label><div class="word-set-actions"><button type="button" class="secondary" id="import-word-set">Importer JSON</button><button type="button" class="secondary" id="export-word-set">Exporter JSON</button></div></div><input id="word-set-file" type="file" accept="application/json,.json" hidden /><p id="word-set-status" class="search-note" aria-live="polite">La liste reste entièrement éditable après chargement d’un preset.</p><aside id="word-set-diagnostic" class="word-set-diagnostic" aria-live="polite"></aside>`;
  textarea.before(tools);
  const presetSelect = tools.querySelector<HTMLSelectElement>('#word-set-preset'); const importButton = tools.querySelector<HTMLButtonElement>('#import-word-set'); const exportButton = tools.querySelector<HTMLButtonElement>('#export-word-set'); const fileInput = tools.querySelector<HTMLInputElement>('#word-set-file'); const status = tools.querySelector<HTMLElement>('#word-set-status'); const diagnostic = tools.querySelector<HTMLElement>('#word-set-diagnostic');
  if (!presetSelect || !importButton || !exportButton || !fileInput || !status || !diagnostic) return;
  const refreshDiagnostic = (): void => renderDiagnostic(textarea, diagnostic);
  presetSelect.addEventListener('change', () => { const preset = WORD_SET_PRESETS.find(({ id }) => id === presetSelect.value); if (!preset) return; textarea.value = wordSetToTextarea(preset); status.textContent = `${preset.name} chargé : ${preset.entries.length} mots. Tu peux maintenant modifier librement la liste.`; refreshDiagnostic(); });
  importButton.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async () => { const file = fileInput.files?.[0]; if (!file) return; const parsed = parseWordSetJson(await file.text()); if (!parsed.ok) { status.textContent = `Import refusé — ${renderIssues(parsed.issues)}`; fileInput.value = ''; return; } textarea.value = wordSetToTextarea(parsed.value); presetSelect.value = WORD_SET_PRESETS.some(({ id }) => id === parsed.value.id) ? parsed.value.id : ''; status.textContent = `${parsed.value.name} importé : ${parsed.value.entries.length} mots valides.`; fileInput.value = ''; refreshDiagnostic(); });
  exportButton.addEventListener('click', () => { const wordSet = textareaToWordSet(textarea); if (wordSet.entries.length === 0) { status.textContent = 'Export impossible : ajoute au moins un mot.'; return; } downloadWordSet(wordSet); status.textContent = `${wordSet.entries.length} mots exportés dans un artefact ${WORD_SET_SCHEMA}.`; });
  textarea.addEventListener('input', () => { presetSelect.value = ''; refreshDiagnostic(); });
  refreshDiagnostic();
}

const observer = new MutationObserver(() => installWordSetPlayground());
observer.observe(document.documentElement, { childList: true, subtree: true });
installWordSetPlayground();
