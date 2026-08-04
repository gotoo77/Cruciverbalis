# Comparaison humaine par paires

Cruciverbalis sait maintenant observer des différences que son modèle de qualité ne sait pas encore interpréter. La comparaison humaine par paires sert précisément à explorer cette frontière sans transformer trop tôt une préférence en règle algorithmique.

## Pourquoi comparer à qualité égale ?

Le mode Pareto peut produire plusieurs grilles ayant exactement le même `GridQuality` mais des morphologies différentes. C'est le cas le plus intéressant pour demander un jugement humain : les critères actuels déclarent ces solutions équivalentes, alors que leur expérience visuelle ou éditoriale peut différer.

La démo construit donc en priorité des paires qui :

- appartiennent au même profil exact `GridQuality` ;
- ont des signatures morphologiques différentes ;
- restent des solutions distinctes après déduplication par translation.

Le nombre de comparaisons est volontairement borné afin de ne pas transformer une exploration en corvée.

## Décisions possibles

Pour chaque paire, l'utilisateur peut répondre :

- préférence pour A ;
- préférence pour B ;
- équivalence perceptive ;
- indécision / passage.

Aucune réponse ne modifie le solveur, la dominance ou les métriques. Il s'agit d'observations humaines.

## Artefact exporté

Les jugements peuvent être exportés explicitement en JSON sous le schéma :

```text
cruciverbalis.human-comparison.v1
```

Chaque vote contient les identités stables des deux solutions, le profil de qualité partagé, les deux morphologies observées et la décision humaine.

L'identité d'une solution est invariante par translation afin de ne pas encoder des coordonnées de recherche accidentelles.

## Vie privée et architecture

La GitHub Page n'envoie rien à un backend. Les votes restent en mémoire dans l'onglet courant jusqu'à un export explicite par l'utilisateur.

Cette forme d'artefact est aussi une première brique compatible avec l'ambition future de Delibra : un protocole pourra un jour consommer des préférences humaines traçables sans que Delibra devienne le moteur géométrique.

## Ce que cette tranche ne fait pas

Elle ne déduit pas encore qu'un faible ratio d'aspect, un petit diamètre de graphe ou toute autre morphologie est « meilleure ». L'objectif est au contraire de collecter des jugements avant de formaliser une préférence éditoriale.
