# Pouvoir discriminant des métriques morphologiques

Les métriques de morphologie introduites précédemment sont volontairement descriptives. Cette tranche cherche à répondre à une question plus précise avant d'en promouvoir une au rang d'objectif d'optimisation :

> parmi les solutions qui ont exactement le même `GridQuality`, quelles dimensions morphologiques permettent réellement de les distinguer ?

## Principe

L'analyse ne regarde que les **familles de qualité répétées**, c'est-à-dire les groupes contenant au moins deux solutions avec le même vecteur `GridQuality`.

Pour chaque métrique morphologique, elle mesure :

- dans combien de familles répétées la métrique varie ;
- le taux de discrimination correspondant ;
- le plus grand nombre de valeurs distinctes observé dans une famille ;
- l'écart numérique maximal observé dans une famille.

Les métriques sont ensuite classées par nombre de familles qu'elles savent séparer.

## Interprétation

Une métrique qui varie souvent entre des grilles de même qualité actuelle révèle une dimension de forme que `GridQuality` ne capture pas.

Cela ne signifie pas encore que cette métrique est **bonne** au sens éditorial. Par exemple, constater que le diamètre du graphe distingue beaucoup de familles ne dit pas s'il faut le minimiser, le maximiser ou simplement le conserver comme information.

Cette tranche reste donc observationnelle :

- aucune nouvelle équivalence ;
- aucune pondération ;
- aucune modification de `dominates(...)` ;
- aucun nouvel élagage dans le solveur.

## Étape suivante

Les résultats observés dans la démo et les fixtures devront guider la décision suivante : choisir éventuellement une ou plusieurs dimensions morphologiques candidates, puis formuler explicitement l'hypothèse éditoriale associée avant de modifier l'optimisation Pareto.
