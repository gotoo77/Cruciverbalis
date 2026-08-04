# PlayableCrossword v1

`PlayableCrossword` est l’artefact de composition qui transforme une grille sélectionnée en objet réellement jouable.

Il ne remplace ni `WordSet`, ni `ClueSet`, ni la géométrie du solveur. Il les relie explicitement.

## Contrat

Schéma : `cruciverbalis.playable-crossword.v1`

Un artefact contient :

- l’identifiant et le nom du jeu ;
- la langue ;
- les identifiants des artefacts source (`wordSetId` optionnel, `clueSetId` requis) ;
- la géométrie exacte de chaque entrée placée (`row`, `col`, `direction`) ;
- un unique indice éditorial sélectionné pour chaque entrée ;
- une provenance optionnelle.

## Composition explicite

Si une réponse ne possède qu’un seul indice dans le `ClueSet`, le compositeur peut le sélectionner automatiquement.

Si plusieurs indices existent pour la même réponse, le compositeur refuse d’inventer une préférence : il exige un `ClueSelection` explicite.

```ts
composePlayableCrossword(grid, clueSet, {
  id: 'demo-1',
  name: 'Démo fruits',
  clueSelections: [
    { answer: 'PASTEQUE', clueId: 'pasteque-wordplay' },
  ],
});
```

Cette règle maintient la séparation entre :

1. la géométrie produite par le solveur ;
2. le catalogue éditorial fourni par `ClueSet` ;
3. la décision de publication qui choisit un indice précis.

## Pourquoi l’indice est copié dans l’artefact

`PlayableCrossword` conserve `clueSetId` mais snapshotte aussi le `kind` et le texte de l’indice choisi. Le résultat reste donc jouable et reproductible même si le catalogue source évolue ensuite.

Aucune de ces données n’alimente le score du solveur, Pareto ou les métriques morphologiques.
