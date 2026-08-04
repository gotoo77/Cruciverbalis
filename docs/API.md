# API de génération

L'interface publique de Cruciverbalis est volontairement plus petite que ses solveurs internes.

Les consommateurs applicatifs — notamment la GitHub Page — doivent importer depuis `src/api` plutôt que dépendre directement de `solver/greedy`, `solver/backtracking` ou de l'archive Pareto.

```ts
import { generate } from './api';

const result = generate({
  entries: [
    { answer: 'MAISON' },
    { answer: 'SOURIS' },
    { answer: 'RAISON' },
  ],
  strategy: 'pareto',
});
```

## Stratégies

- `greedy` : une solution rapide, sans métriques de recherche ;
- `backtracking` : une solution issue de la recherche récursive, avec métriques ;
- `pareto` : toutes les solutions non dominées conservées par la recherche Pareto.

La stratégie par défaut est `backtracking`.

## Contrat de sortie

Toutes les stratégies retournent le même conteneur `GenerationResult` :

- `strategy` : stratégie effectivement utilisée ;
- `solutions` : zéro, une ou plusieurs grilles mesurées ;
- `search` : métriques de recherche lorsqu'elles existent ;
- `truncated` : indique si le budget de nœuds a interrompu la recherche.

Chaque solution expose la grille, les entrées non placées et son vecteur `GridQuality`.

## Frontière d'architecture

Cette API est une façade, pas un nouveau solveur. Elle protège l'interface utilisateur des changements internes de stratégie et constitue le contrat consommé par la GitHub Page interactive.

Cette frontière doit également permettre à de futurs consommateurs — exporteurs, éditeurs ou intégrations d'orchestration comme Delibra — d'utiliser Cruciverbalis sans dépendre des détails des solveurs.

Les types internes restent accessibles au moteur et aux tests spécialisés, mais le code applicatif ne doit pas les appeler directement sans raison explicite.
