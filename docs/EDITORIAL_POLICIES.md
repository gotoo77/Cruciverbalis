# Politiques éditoriales

Une politique éditoriale exprime un point de vue assumé sur la forme des grilles. Elle ne décrit ni une vérité universelle, ni une nouvelle métrique objective.

Le format V1 est versionné :

```ts
interface EditorialPolicy {
  schema: 'cruciverbalis.editorial-policy.v1';
  id: string;
  name: string;
  version: number;
  description: string;
  preferences: EditorialPreference[];
}
```

Chaque préférence cible une métrique morphologique existante et indique :

- `lower` : une valeur plus faible est préférée ;
- `higher` : une valeur plus élevée est préférée ;
- `target` : une valeur proche d'une cible explicite est préférée.

## Ordre lexicographique, pas score opaque

L'ordre des préférences est significatif. La première dimension sépare d'abord les solutions ; la suivante ne départage que les égalités restantes.

```text
préférence 1
    ↓ égalité seulement
préférence 2
    ↓ égalité seulement
préférence 3
```

Cette approche évite d'inventer silencieusement des poids tels que :

```text
-2 × ratio d'aspect - 5 × diamètre + 3 × densité
```

Un tel score obligerait à prétendre connaître une équivalence quantitative entre des propriétés qui ne sont pas naturellement commensurables.

## Presets initiaux

- `balanced` : silhouette proche du carré, puis diamètre faible et peu de feuilles ;
- `compact-network` : graphe court, peu de feuilles, silhouette peu exposée ;
- `exploratory` : formes plus ramifiées et étendues, pour explorer la diversité.

Ces presets sont des exemples explicites et révisables. Leur présence ne signifie pas qu'ils ont été validés par les retours humains collectés.

## Frontière architecturale

`rankByEditorialPolicy(...)` agit après la génération :

```text
solveur
  ↓
solutions / front de Pareto
  ↓
politique éditoriale facultative
  ↓
classement interprétable
```

Elle ne modifie pas :

- `GridQuality` ;
- `dominates(...)` ;
- le front de Pareto ;
- MRV, Branch & Bound ou l'ordre de recherche ;
- l'équivalence géométrique ;
- les artefacts de retours humains.

Le résultat conserve, pour chaque solution, la valeur observée et la distance de classement de chaque critère. Une égalité reste une égalité.

## Lien futur avec Delibra

Delibra pourra plus tard proposer, discuter, comparer ou faire évoluer des politiques sous forme d'artefacts argumentés. Cruciverbalis restera responsable de leur validation déterministe et de leur application reproductible.
