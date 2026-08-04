import { CLUE_SET_SCHEMA, type ClueSet } from './clue-set';

export const CLUE_SET_PRESETS: readonly ClueSet[] = [
  {
    schema: CLUE_SET_SCHEMA,
    id: 'fruit-fr-v1',
    name: 'Fruits — styles variés',
    language: 'fr',
    description: 'Petit corpus de démonstration pour explorer plusieurs types d’indices sur les mêmes réponses.',
    license: 'CC0-1.0',
    author: 'Cruciverbalis',
    clues: [
      {
        id: 'pasteque-definition',
        answer: 'PASTEQUE',
        kind: 'definition',
        text: 'Gros fruit à chair rouge et très riche en eau.',
        difficulty: 1,
      },
      {
        id: 'pasteque-wordplay',
        answer: 'PASTEQUE',
        kind: 'wordplay',
        text: 'Elle a le cœur rouge mais ne bat jamais.',
        difficulty: 3,
      },
      {
        id: 'citron-definition',
        answer: 'CITRON',
        kind: 'definition',
        text: 'Agrume jaune à la saveur très acide.',
        difficulty: 1,
      },
      {
        id: 'citron-wordplay',
        answer: 'CITRON',
        kind: 'wordplay',
        text: 'Il fait parfois grimacer avant même qu’on le presse.',
        difficulty: 3,
      },
      {
        id: 'pomme-historical',
        answer: 'POMME',
        kind: 'historical',
        text: 'Fruit devenu symbole scientifique dans la légende associée à Newton.',
        difficulty: 2,
      },
      {
        id: 'orange-analogy',
        answer: 'ORANGE',
        kind: 'analogy',
        text: 'Au fruit ce que son nom est aussi à une couleur.',
        difficulty: 2,
      },
    ],
    provenance: { createdBy: 'cruciverbalis', source: 'built-in-preset' },
  },
  {
    schema: CLUE_SET_SCHEMA,
    id: 'linux-fr-v1',
    name: 'Linux — technique & culture',
    language: 'fr',
    description: 'Indices techniques, historiques et joueurs autour de Linux.',
    license: 'CC0-1.0',
    author: 'Cruciverbalis',
    clues: [
      {
        id: 'linux-definition',
        answer: 'LINUX',
        kind: 'definition',
        text: 'Famille de systèmes d’exploitation construits autour d’un noyau libre.',
        difficulty: 1,
      },
      {
        id: 'noyau-analogy',
        answer: 'NOYAU',
        kind: 'analogy',
        text: 'Au système d’exploitation ce que le cœur est à un organisme.',
        difficulty: 2,
      },
      {
        id: 'fedora-historical',
        answer: 'FEDORA',
        kind: 'historical',
        text: 'Distribution communautaire liée à Red Hat et lancée au début des années 2000.',
        difficulty: 3,
      },
      {
        id: 'shell-wordplay',
        answer: 'SHELL',
        kind: 'wordplay',
        text: 'Coquille où l’on tape parfois bien plus qu’on ne mange.',
        difficulty: 3,
      },
      {
        id: 'daemon-etymology',
        answer: 'DAEMON',
        kind: 'etymology',
        text: 'Nom informatique hérité d’un esprit intermédiaire de la mythologie grecque.',
        difficulty: 4,
      },
    ],
    provenance: { createdBy: 'cruciverbalis', source: 'built-in-preset' },
  },
];

export function findClueSetPreset(id: string): ClueSet | undefined {
  return CLUE_SET_PRESETS.find((preset) => preset.id === id);
}
