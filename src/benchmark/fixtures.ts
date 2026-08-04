import type { Entry } from '../core/domain';

export interface BenchmarkFixture {
  readonly id: string;
  readonly description: string;
  readonly entries: readonly Entry[];
}

export const benchmarkFixtures: readonly BenchmarkFixture[] = [
  {
    id: 'small-connected',
    description: 'Petit ensemble fortement connectable pour comparer le coût de base.',
    entries: [
      { answer: 'CHAT' },
      { answer: 'TACHE' },
      { answer: 'HACHE' },
      { answer: 'THE' },
    ],
  },
  {
    id: 'medium-overlap',
    description: 'Ensemble moyen avec plusieurs croisements concurrents.',
    entries: [
      { answer: 'MAISON' },
      { answer: 'SOURIS' },
      { answer: 'RAISON' },
      { answer: 'MARS' },
      { answer: 'SOIN' },
      { answer: 'ROSE' },
    ],
  },
  {
    id: 'mixed-connectivity',
    description: 'Mélange de mots connectables et d’une entrée volontairement isolée.',
    entries: [
      { answer: 'PLANETE' },
      { answer: 'ETOILE' },
      { answer: 'SATELLITE' },
      { answer: 'ESPACE' },
      { answer: 'TELESCOPE' },
      { answer: 'ORBE' },
      { answer: 'XYZ' },
    ],
  },
];
