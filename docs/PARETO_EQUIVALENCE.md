# Équivalence des solutions Pareto

La démo interactive a rendu visible une propriété que les tests du solveur ne montraient pas clairement : un front de Pareto mathématiquement valide peut contenir plusieurs solutions qui ne représentent pas autant de choix intéressants pour un humain.

Cette tranche introduit une première notion volontairement étroite d'équivalence.

## Niveau 1 — translation

Deux grilles dont tous les placements ne diffèrent que par un même déplacement `(Δrow, Δcol)` sont considérées comme la même solution.

Les coordonnées absolues sont un détail de la recherche. Une grille déplacée de dix cases vers la droite ne constitue pas un nouveau compromis.

L'archive Pareto utilise donc une signature canonique ancrée à `(0, 0)`.

## Ce que nous ne quotientons pas encore

Cette modification ne confond volontairement pas :

- deux grilles différentes ayant seulement le même vecteur `GridQuality` ;
- une grille et sa rotation ;
- une grille et son miroir ;
- deux placements ayant une topologie de croisements similaire mais une géométrie différente.

Ces cas demandent des décisions sémantiques supplémentaires. En particulier, rotation et réflexion peuvent modifier l'orientation across/down et devenir pertinentes pour de futurs critères éditoriaux.

## Pourquoi procéder par niveaux

Le but n'est pas de réduire artificiellement la taille du front, mais de comprendre ce que signifie « solution différente ».

La progression visée est :

1. éliminer les différences purement représentationnelles certaines ;
2. mesurer les redondances restantes ;
3. caractériser les familles de solutions par qualité et topologie ;
4. seulement ensuite décider quelles équivalences supplémentaires sont légitimes.

Cette distinction évite de jeter une diversité réelle simplement parce que deux grilles partagent les mêmes métriques actuelles.
