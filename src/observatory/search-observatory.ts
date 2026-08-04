export interface SearchObservationInput {
  readonly nodesExplored: number;
  readonly placementsTried: number;
  readonly backtracks: number;
  readonly deadEnds: number;
  readonly solutionsFound: number;
  readonly maxDepth: number;
  readonly mrvSelections: number;
  readonly candidateSetsEvaluated: number;
  readonly branchesPruned: number;
  readonly paretoCandidates: number;
  readonly paretoAccepted: number;
}

export interface SearchObservation {
  readonly branchingPressure: number;
  readonly backtrackRate: number;
  readonly deadEndRate: number;
  readonly pruningRate: number;
  readonly paretoAcceptanceRate: number;
  readonly narrative: readonly string[];
}

const ratio = (value: number, total: number): number => total === 0 ? 0 : value / total;

export function analyzeSearchObservation(metrics: SearchObservationInput): SearchObservation {
  const branchingPressure = ratio(metrics.placementsTried, metrics.nodesExplored);
  const backtrackRate = ratio(metrics.backtracks, metrics.nodesExplored);
  const deadEndRate = ratio(metrics.deadEnds, metrics.nodesExplored);
  const pruningRate = ratio(metrics.branchesPruned, metrics.branchesPruned + metrics.nodesExplored);
  const paretoAcceptanceRate = ratio(metrics.paretoAccepted, metrics.paretoCandidates);
  const narrative: string[] = [];

  narrative.push(
    branchingPressure >= 4
      ? 'Chaque nœud ouvre beaucoup de placements possibles : le matériau est combinatoire.'
      : branchingPressure >= 1.5
        ? 'Le solveur rencontre plusieurs alternatives par nœud, mais l’espace reste contenu.'
        : 'La recherche est étroite : peu de placements sont essayés par nœud.',
  );

  if (metrics.mrvSelections > 0) {
    narrative.push(`MRV a choisi ${metrics.mrvSelections} fois l’entrée la plus contrainte pour réduire les embranchements.`);
  }
  if (metrics.branchesPruned > 0) {
    narrative.push(`Branch & Bound a évité ${metrics.branchesPruned} branche${metrics.branchesPruned > 1 ? 's' : ''} qui ne pouvaient plus battre l’incumbent.`);
  }
  if (metrics.deadEnds > 0) {
    narrative.push(`${metrics.deadEnds} impasse${metrics.deadEnds > 1 ? 's' : ''} ont forcé le moteur à revenir sur un choix antérieur.`);
  }
  if (metrics.paretoCandidates > 0) {
    narrative.push(`${metrics.paretoAccepted}/${metrics.paretoCandidates} solutions terminales ont été retenues dans le front au moment de leur évaluation.`);
  }

  return {
    branchingPressure,
    backtrackRate,
    deadEndRate,
    pruningRate,
    paretoAcceptanceRate,
    narrative,
  };
}
