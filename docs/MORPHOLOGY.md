# Morphologie descriptive des grilles

La qualité actuelle de Cruciverbalis mesure la complétude, les croisements, l'aire, la densité et l'équilibre horizontal / vertical. La démo a montré que plusieurs grilles peuvent pourtant partager exactement ce vecteur et avoir des formes perceptiblement différentes.

Cette tranche ajoute donc une couche **descriptive** de morphologie. Elle n'ajoute aucun objectif au front de Pareto.

## Métriques observées

Pour chaque grille, `measureGridMorphology(...)` expose :

- `width` et `height` : dimensions de la boîte englobante ;
- `aspectRatio` : rapport entre le côté le plus long et le plus court ;
- `exposedEdges` : nombre de bords de cases occupées exposés au vide, approximation simple de la rugosité de la silhouette ;
- `leafEntries` : nombre de mots de degré 1 dans le graphe des croisements ;
- `maxEntryDegree` : nombre maximal de voisins croisés par un mot ;
- `graphDiameter` : plus longue distance minimale entre deux mots dans le graphe des croisements.

Le graphe des croisements considère chaque mot placé comme un sommet et chaque croisement comme une connexion entre deux sommets.

## Ce que ces métriques ne font pas

Elles ne modifient ni `GridQuality`, ni `dominates(...)`, ni le solveur Pareto. Une grille n'est donc jamais éliminée parce qu'elle a davantage de bords exposés, un grand diamètre ou un ratio d'aspect élevé.

Cette séparation est volontaire : nous voulons d'abord observer quelles dimensions expliquent réellement les familles de qualité répétées avant d'en promouvoir une en critère d'optimisation.

## Analyse du front

`analyzeParetoMorphology(...)` compte les profils morphologiques présents dans un front et indique notamment combien de profils de qualité actuels se divisent en plusieurs morphologies mesurées.

Cette statistique répond à une question précise :

> parmi les solutions que notre modèle de qualité juge identiques, combien deviennent distinguables lorsque l'on décrit aussi leur forme ?

Même un profil morphologique identique ne constitue pas encore une équivalence de grille. Deux géométries différentes peuvent toujours partager toutes les métriques actuellement observées.
