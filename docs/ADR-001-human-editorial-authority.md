# ADR-001 — Autorité éditoriale humaine comme contrainte durable

Statut : **adopté**

## Contexte

Cruciverbalis sait désormais générer, compléter, inspecter, publier et faire jouer une grille. Le manque principal n'est plus la génération mais la possibilité pour le verbicruciste de reprendre la main sans perdre son travail lors d'une nouvelle dérivation.

Modifier directement `PlayableCrossword` mélangerait proposition calculée, état éditorial mutable et provenance. Cela rendrait difficile de savoir ce que le moteur a produit, ce que l'humain a décidé et pourquoi une régénération diffère.

## Décision

Les décisions humaines sont conservées dans un artefact versionné séparé : `EditorialLockSet`.

Une décision verrouillée est une **contrainte dure**, pas une préférence ni une dimension de qualité. Le moteur peut proposer une autre solution, mais il ne peut pas violer silencieusement un verrou pour améliorer un score ou le front de Pareto.

La dérivation conceptuelle devient :

```text
sources + proposition + EditorialLockSet -> dérivation contrainte
```

Si aucun résultat ne satisfait les verrous, l'opération échoue explicitement et retourne les conflits. Elle ne relâche jamais automatiquement une décision humaine.

## Première portée

La V1 commence volontairement petit avec le verrouillage d'un placement : réponse normalisée, coordonnées de départ et direction. C'est la primitive nécessaire pour figer un mot choisi par le verbicruciste tout en laissant le moteur travailler autour.

Les futurs types de verrou — choix d'indice, case, exclusion lexicale, rôle thématique, etc. — devront être ajoutés explicitement et versionnés.

## Invariants

1. Un verrou humain n'est jamais converti en score.
2. Une dérivation déclarée réussie respecte tous les verrous applicables.
3. Une incompatibilité est observable et structurée.
4. L'artefact de verrou est sérialisable, validable et indépendant de `PlayableCrossword`.
5. Les transformations qui ne modifient pas une décision verrouillée restent libres d'optimiser le reste de la grille.
6. La provenance permet de relier les décisions à leurs artefacts parents lorsque cette information est disponible.

## Conséquences

Le moteur reste déterministe et rejouable. L'interface pourra distinguer clairement proposition machine et décision humaine. Les futures boucles de feedback joueur pourront produire des recommandations sans acquérir implicitement l'autorité de modifier la grille.
