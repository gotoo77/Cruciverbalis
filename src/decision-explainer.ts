import {
  EDITORIAL_POLICIES,
  explainEditorialDecision,
  explainParetoRelation,
  generate,
  type EditorialPolicy,
  type Entry,
  type GenerationStrategy,
} from './api';

function parseEntries(value: string): Entry[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => ({ answer: (line.split('|')[0] ?? '').trim() }))
    .filter(({ answer }) => answer.length > 0);
}

const policies = Object.values(EDITORIAL_POLICIES) as EditorialPolicy[];

function installDecisionExplainer(): void {
  const resultPanel = document.querySelector<HTMLElement>('.panel.result');
  if (!resultPanel || document.querySelector('#decision-explainer')) return;

  const section = document.createElement('section');
  section.id = 'decision-explainer';
  section.className = 'decision-explainer';
  section.innerHTML = `
    <div class="decision-explainer-heading">
      <div>
        <p class="eyebrow">Explicabilité</p>
        <h3>Pourquoi ce classement ?</h3>
      </div>
      <select id="explanation-policy" aria-label="Politique éditoriale">
        ${policies.map((policy) => `<option value="${policy.id}">${policy.name}</option>`).join('')}
      </select>
    </div>
    <p class="search-note">Le moteur compare les deux premières solutions avec des règles déterministes.</p>
    <button type="button" class="secondary" id="explain-decision">Pourquoi ?</button>
    <div id="decision-explanation" class="decision-explanation" aria-live="polite"></div>
  `;

  resultPanel.append(section);

  const button = section.querySelector<HTMLButtonElement>('#explain-decision');
  const policySelect = section.querySelector<HTMLSelectElement>('#explanation-policy');
  const output = section.querySelector<HTMLElement>('#decision-explanation');
  if (!button || !policySelect || !output) return;

  button.addEventListener('click', () => {
    const textarea = document.querySelector<HTMLTextAreaElement>('#entries');
    const strategySelect = document.querySelector<HTMLSelectElement>('#strategy');
    const maxNodesSelect = document.querySelector<HTMLSelectElement>('#max-nodes');
    if (!textarea || !strategySelect || !maxNodesSelect) return;

    const result = generate({
      entries: parseEntries(textarea.value),
      strategy: strategySelect.value as GenerationStrategy,
      maxNodes: Number(maxNodesSelect.value),
    });

    if (result.solutions.length < 2) {
      output.textContent = 'Il faut au moins deux solutions pour expliquer un classement ou un compromis.';
      return;
    }

    const policy = policies.find(({ id }) => id === policySelect.value) ?? policies[0];
    if (!policy) return;
    const editorial = explainEditorialDecision(result.solutions, policy);
    const pareto = explainParetoRelation(
      result.solutions[0]!.quality,
      result.solutions[1]!.quality,
    );

    output.innerHTML = `
      <article><strong>Politique éditoriale</strong><p>${editorial?.message ?? 'Aucune explication éditoriale disponible.'}</p></article>
      <article><strong>Relation Pareto</strong><p>${pareto.message}</p></article>
      <p class="search-note">Explication calculée à partir des métriques et de l’ordre explicite des critères ; aucun LLM n’est utilisé.</p>
    `;
  });
}

const observer = new MutationObserver(() => installDecisionExplainer());
observer.observe(document.documentElement, { childList: true, subtree: true });
installDecisionExplainer();
