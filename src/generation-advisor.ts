import {
  analyzeWordSet,
  WORD_SET_SCHEMA,
  type GenerationStrategy,
  type SearchComplexity,
  type WordSet,
  type WordSetAnalysis,
} from './api';

export interface GenerationRecommendation {
  readonly strategy: GenerationStrategy;
  readonly maxNodes: number;
  readonly rationale: string;
}

export function recommendGeneration(analysis: WordSetAnalysis): GenerationRecommendation {
  const strategy: GenerationStrategy = analysis.estimatedComplexity === 'experimental'
    ? 'greedy'
    : 'backtracking';

  const rationale = strategy === 'greedy'
    ? 'Le corpus est expérimental : priorité à une réponse rapide et partielle.'
    : `Recherche exacte budgétée pour une complexité ${complexityLabel(analysis.estimatedComplexity)}.`;

  return {
    strategy,
    maxNodes: analysis.recommendedMaxNodes,
    rationale,
  };
}

function complexityLabel(complexity: SearchComplexity): string {
  return ({
    low: 'faible',
    moderate: 'modérée',
    high: 'élevée',
    experimental: 'expérimentale',
  })[complexity];
}

function textareaToWordSet(textarea: HTMLTextAreaElement): WordSet {
  const entries = textarea.value
    .split(/\r?\n/)
    .map((line) => (line.split('|')[0] ?? '').trim())
    .filter(Boolean)
    .map((answer) => ({ answer }));

  return {
    schema: WORD_SET_SCHEMA,
    id: 'browser-generation-draft',
    name: 'Corpus courant de génération',
    language: 'fr',
    entries,
  };
}

function ensureOption(select: HTMLSelectElement, value: string, label: string, beforeFirst = false): void {
  if ([...select.options].some((option) => option.value === value)) return;
  const option = new Option(label, value);
  if (beforeFirst) select.insertBefore(option, select.firstElementChild);
  else select.append(option);
}

function installGenerationAdvisor(): void {
  const textarea = document.querySelector<HTMLTextAreaElement>('#entries');
  const strategy = document.querySelector<HTMLSelectElement>('#strategy');
  const maxNodes = document.querySelector<HTMLSelectElement>('#max-nodes');
  const generate = document.querySelector<HTMLButtonElement>('#generate');
  if (!textarea || !strategy || !maxNodes || !generate || document.querySelector('#generation-advisor')) return;

  ensureOption(strategy, 'auto', 'Automatique (recommandé)', true);
  ensureOption(maxNodes, 'auto', 'Automatique (recommandé)', true);
  for (const budget of [250_000, 500_000, 1_000_000]) {
    ensureOption(maxNodes, String(budget), `${budget.toLocaleString('fr-FR')} nœuds`);
  }
  strategy.value = 'auto';
  maxNodes.value = 'auto';

  const panel = document.createElement('aside');
  panel.id = 'generation-advisor';
  panel.className = 'generation-advisor';
  maxNodes.closest('.control-row')?.after(panel);

  let recommendation = recommendGeneration(analyzeWordSet(textareaToWordSet(textarea)));

  const refresh = (): void => {
    const analysis = analyzeWordSet(textareaToWordSet(textarea));
    recommendation = recommendGeneration(analysis);
    const warnings = analysis.warnings.length > 0
      ? `<ul>${analysis.warnings.map((warning) => `<li>${warning}</li>`).join('')}</ul>`
      : '<p>Aucun avertissement de scalabilité.</p>';
    panel.innerHTML = `
      <strong>Configuration conseillée</strong>
      <span>${recommendation.strategy === 'greedy' ? 'Glouton' : 'Backtracking + MRV + B&B'} · ${recommendation.maxNodes.toLocaleString('fr-FR')} nœuds</span>
      <p>${recommendation.rationale}</p>
      ${warnings}
      <small>Les sélecteurs « Automatique » appliquent cette recommandation au lancement. Un réglage manuel reste prioritaire.</small>
    `;
  };

  textarea.addEventListener('input', refresh);
  document.addEventListener('cruciverbalis:wordset-changed', refresh);

  // Le listener principal lit les valeurs pendant la phase bubble. En capture,
  // on matérialise donc la recommandation, puis on restaure l'affichage « auto ».
  generate.addEventListener('click', () => {
    const restoreStrategy = strategy.value === 'auto';
    const restoreBudget = maxNodes.value === 'auto';
    if (restoreStrategy) strategy.value = recommendation.strategy;
    if (restoreBudget) maxNodes.value = String(recommendation.maxNodes);
    queueMicrotask(() => {
      if (restoreStrategy) strategy.value = 'auto';
      if (restoreBudget) maxNodes.value = 'auto';
    });
  }, { capture: true });

  refresh();
}

if (typeof document !== 'undefined') {
  const observer = new MutationObserver(installGenerationAdvisor);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  installGenerationAdvisor();
}
