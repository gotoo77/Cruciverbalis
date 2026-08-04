# Cartographie du front de Pareto

Après l'élimination des copies équivalentes par translation, la taille brute du front ne dit toujours pas combien de compromis réellement différents il contient.

Cette tranche ajoute une **analyse descriptive** du front sans introduire de nouvelle équivalence.

## Familles de qualité

Deux solutions appartiennent à la même famille de qualité lorsqu'elles ont exactement le même vecteur `GridQuality` :

- nombre de mots placés ;
- nombre de croisements ;
- aire ;
- densité ;
- équilibre horizontal / vertical.

L'analyse expose notamment :

- le nombre total de solutions ;
- le nombre de profils de qualité distincts ;
- le nombre de profils présents plusieurs fois ;
- le nombre de solutions appartenant à ces profils répétés ;
- la taille de la plus grande famille.

## Important : famille n'est pas équivalence

Deux grilles qui ont les mêmes métriques ne sont **pas** considérées comme identiques.

Elles peuvent avoir :

- des géométries différentes ;
- des mots croisés à des positions relatives différentes ;
- des silhouettes très différentes ;
- une qualité perceptive différente que notre modèle ne mesure pas encore.

Le regroupement sert donc à observer les limites du modèle de qualité actuel, pas à jeter des solutions.

## Pourquoi maintenant

La GitHub Page a montré plusieurs solutions Pareto ayant des métriques identiques. La bonne question n'est pas encore « faut-il les fusionner ? », mais :

> combien de diversité géométrique notre vecteur de qualité actuel ne distingue-t-il pas ?

La réponse à cette question doit guider les futurs critères morphologiques avant toute nouvelle règle d'équivalence.
