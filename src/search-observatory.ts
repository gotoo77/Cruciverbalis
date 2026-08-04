import { analyzeSearchObservation, type SearchObservationInput } from './observatory/search-observatory';
import './search-observatory.css';

const labels: Record<string, keyof SearchObservationInput> = {
  'Nœuds': 'nodesExplored',
  'Placements essayés': 'placementsTried',
  'Backtracks': 'backtracks',
  'Impasses': 'deadEnds',
  'Branches élaguées': 'branchesPruned',
  'Sélections MRV': 'mrvSelections',
  'Solutions terminales': 'solutionsFound',
  'Candidats Pareto': 'paretoCandidates',
};

function readMetrics(container: Element): SearchObservationInput | undefined {
  const values: Partial<Record<keyof SearchObservationInput, number>> = {};
  container.querySelectorAll<HTMLElement>('.search-grid span').forEach((item) => {
    const label = item.childNodes[0]?.textContent?.trim();
    const key = label ? labels[label] : undefined;
    const value = Number(item.querySelector('strong')?.textContent ?? '');
    if (key && Number.isFinite(value)) values[key] = value;
  });

  if (values.nodesExplored === undefined) return undefined;
  return {
    nodesExplored: values.nodesExplored,
    placementsTried: values.placementsTried ?? 0,
    backtracks: values.backtracks ?? 0,
    deadEnds: values.deadEnds ?? 0,
    solutionsFound: values.solutionsFound ?? 0,
    maxDepth: 0,
    mrvSelections: values.mrvSelections ?? 0,
    candidateSetsEvaluated: 0,
    branchesPruned: values.branchesPruned ?? 0,
    paretoCandidates: values.paretoCandidates ?? 0,
    paretoAccepted: values.paretoCandidates ?? 0,
  };
}

const percent = (value: number): string => `${Math.round(value * 100)}%`;

function install(): void {
  document.querySelectorAll<HTMLElement>('.search-details').forEach((details) => {
    if (details.querySelector('.search-observatory')) return;
    const metrics = readMetrics(details);
    if (!metrics) return;
    const observation = analyzeSearchObservation(metrics);
    const section = document.createElement('section');
    section.className = 'search-observatory';
    section.innerHTML = `
      <h4>Lecture de la recherche</h4>
      <div class="search-observatory-bars">
        <span><i style="--value:${Math.min(1, observation.backtrackRate)}"></i><b>Retours</b><strong>${percent(observation.backtrackRate)}</strong></span>
        <span><i style="--value:${Math.min(1, observation.deadEndRate)}"></i><b>Impasses</b><strong>${percent(observation.deadEndRate)}</strong></span>
        <span><i style="--value:${Math.min(1, observation.pruningRate)}"></i><b>Élagage</b><strong>${percent(observation.pruningRate)}</strong></span>
      </div>
      <ul>${observation.narrative.map((sentence) => `<li>${sentence}</li>`).join('')}</ul>
      <p class="search-note">Ces phrases sont produites par des règles déterministes à partir des métriques, sans LLM.</p>
    `;
    details.append(section);
  });
}

new MutationObserver(install).observe(document.documentElement, { childList: true, subtree: true });
install();
