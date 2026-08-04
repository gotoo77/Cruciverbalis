# Corpus de retours humains

Un seul artefact `cruciverbalis.human-comparison.v1` représente une session de comparaisons. Il ne faut pas confondre beaucoup de votes dans une seule session avec un accord observé entre plusieurs sessions.

`analyzeHumanFeedbackCorpus(...)` conserve donc deux lectures séparées :

- **pooled** : tous les votes sont regroupés pour mesurer le signal global ;
- **cross-artifact agreement** : chaque artefact vote implicitement par sa direction descriptive (`lower`, `higher`, `mixed`, `none`) pour chaque métrique morphologique.

Pour chaque métrique, l'analyse expose :

- le nombre d'artefacts apportant effectivement de l'information ;
- le nombre d'artefacts orientés vers une valeur plus faible ou plus élevée ;
- le nombre d'artefacts mixtes ou sans signal ;
- une direction de consensus descriptive ;
- une force de consensus entre les artefacts directionnels.

Cette distinction évite qu'une session très longue écrase mécaniquement plusieurs petites sessions contradictoires.

## Ce que cette analyse ne fait pas

Elle ne connaît ni l'identité, ni l'expertise, ni la représentativité des personnes derrière les artefacts. Elle ne transforme pas non plus un consensus observé en vérité objective ou en règle de solveur.

Elle fournit uniquement une couche d'agrégation explicable qui pourra être utilisée plus tard par une interface d'étude, un protocole Delibra ou une analyse externe.
