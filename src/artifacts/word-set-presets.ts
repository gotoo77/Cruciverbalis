import { WORD_SET_SCHEMA, type WordSet } from './word-set';

export const WORD_SET_PRESETS: readonly WordSet[] = [
  {
    schema: WORD_SET_SCHEMA,
    id: 'energie-fr-v1',
    name: 'Énergie et choix techniques',
    language: 'fr',
    description: 'Jeu de démonstration autour de l’énergie, du risque et du temps long.',
    license: 'CC0-1.0',
    author: 'Cruciverbalis',
    entries: [
      { answer: 'NUCLEAIRE', theme: 'energie', difficulty: 3 },
      { answer: 'SOBRIETE', theme: 'energie', difficulty: 3 },
      { answer: 'ENERGIE', theme: 'energie', difficulty: 1 },
      { answer: 'URANIUM', theme: 'energie', difficulty: 2 },
      { answer: 'DECHET', theme: 'energie', difficulty: 1 },
      { answer: 'CARBONE', theme: 'energie', difficulty: 2 },
      { answer: 'RISQUE', theme: 'energie', difficulty: 1 },
      { answer: 'TEMPS', theme: 'energie', difficulty: 1 },
    ],
    provenance: { createdBy: 'cruciverbalis', source: 'built-in-preset' },
  },
  {
    schema: WORD_SET_SCHEMA,
    id: 'linux-fr-v1',
    name: 'Linux',
    language: 'fr',
    description: 'Un petit ensemble pour explorer un thème informatique.',
    license: 'CC0-1.0',
    author: 'Cruciverbalis',
    entries: [
      { answer: 'LINUX', theme: 'informatique', difficulty: 1 },
      { answer: 'NOYAU', theme: 'informatique', difficulty: 2 },
      { answer: 'TERMINAL', theme: 'informatique', difficulty: 2 },
      { answer: 'FEDORA', theme: 'informatique', difficulty: 2 },
      { answer: 'SHELL', theme: 'informatique', difficulty: 2 },
      { answer: 'PAQUET', theme: 'informatique', difficulty: 2 },
      { answer: 'DAEMON', theme: 'informatique', difficulty: 3 },
      { answer: 'SOURCE', theme: 'informatique', difficulty: 1 },
    ],
    provenance: { createdBy: 'cruciverbalis', source: 'built-in-preset' },
  },
  {
    schema: WORD_SET_SCHEMA,
    id: 'espace-fr-v1',
    name: 'Espace',
    language: 'fr',
    description: 'Planètes, objets célestes et exploration spatiale.',
    license: 'CC0-1.0',
    author: 'Cruciverbalis',
    entries: [
      { answer: 'ETOILE', theme: 'espace', difficulty: 1 },
      { answer: 'PLANETE', theme: 'espace', difficulty: 1 },
      { answer: 'GALAXIE', theme: 'espace', difficulty: 2 },
      { answer: 'COMETE', theme: 'espace', difficulty: 2 },
      { answer: 'ORBITALE', theme: 'espace', difficulty: 3 },
      { answer: 'SATELLITE', theme: 'espace', difficulty: 2 },
      { answer: 'NEBULEUSE', theme: 'espace', difficulty: 3 },
      { answer: 'COSMOS', theme: 'espace', difficulty: 2 },
    ],
    provenance: { createdBy: 'cruciverbalis', source: 'built-in-preset' },
  },
];

export function findWordSetPreset(id: string): WordSet | undefined {
  return WORD_SET_PRESETS.find((preset) => preset.id === id);
}
