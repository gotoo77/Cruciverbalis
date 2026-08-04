# Analyse des retours humains

Les artefacts `cruciverbalis.human-comparison.v1` enregistrent des préférences entre deux grilles de même `GridQuality` mais de morphologies différentes.

Cette tranche ajoute une lecture descriptive de ces votes. Elle ne transforme pas encore une préférence humaine en score, en politique de sélection ou en objectif du solveur.

## Ce qui est mesuré

Pour chaque métrique morphologique (`width`, `height`, `aspectRatio`, `exposedEdges`, `leafEntries`, `maxEntryDegree`, `graphDiameter`), l'analyse ne considère que les votes où les deux grilles diffèrent effectivement sur cette dimension.

Elle expose :

- le nombre de votes comparables ;
- le nombre de décisions préférant la valeur la plus faible ;
- le nombre de décisions préférant la valeur la plus élevée ;
- les égalités et les indécisions ;
- le taux de préférence pour chaque direction parmi les votes décisifs ;
- une force de cohérence comprise entre 0 et 1 ;
- une direction descriptive : `lower`, `higher`, `mixed` ou `none`.

Une cohérence élevée ne signifie pas qu'une métrique est objectivement meilleure. Elle indique seulement qu'un ensemble de jugements observés pointe provisoirement dans une direction.

## Pourquoi cette séparation

Nous voulons éviter le raccourci suivant :

```text
quelques préférences humaines
        ↓
poids arbitraire
        ↓
nouveau score opaque
```

La démarche retenue est plutôt :

```text
comparaisons humaines
        ↓
artefact versionné
        ↓
analyse descriptive
        ↓
réplication sur davantage de cas / personnes
        ↓
éventuelle préférence éditoriale explicite
```

Les fonctions publiques sont `analyzeHumanComparisonVotes(...)` et `analyzeHumanComparisonArtifact(...)`.

Cette couche constitue également un format exploitable plus tard par Delibra pour comparer, expliquer ou agréger des retours humains, sans introduire aujourd'hui de dépendance vers Delibra.
