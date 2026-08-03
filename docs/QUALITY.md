# Qualité des grilles

Cruciverbalis ne cherche pas seulement à remplir une grille. Il cherche à produire une grille qu'un humain prend plaisir à résoudre.

## Principe directeur

> Une grille incomplète mais honnête vaut mieux qu'une grille complète remplie de médiocrités.

Le moteur doit donc pouvoir refuser une contrainte impossible au lieu d'inventer un mot douteux, une abréviation obscure ou une définition bouche-trou.

## Critères de qualité

### Validité structurelle

- chaque réponse tient intégralement dans la grille ;
- deux réponses ne partagent une case que si leurs lettres concordent ;
- aucun mot parallèle ne se superpose à un autre ;
- deux mots ne se touchent pas latéralement sans croisement ;
- les extrémités de deux réponses ne se collent pas pour former un faux mot.

Ces propriétés sont déterministes et doivent être vérifiées par le code.

### Qualité lexicale

- les réponses sont attestées et adaptées au public visé ;
- les formes rares, archaïques ou spécialisées sont explicitement signalées ;
- les réponses très courtes ne sont pas utilisées comme simples rustines ;
- les doublons, variantes artificielles et fragments de mots sont pénalisés.

### Qualité des définitions

- la définition désigne réellement la réponse ;
- son ambiguïté est compatible avec le niveau de difficulté annoncé ;
- elle ne repose pas sur un découpage arbitraire du mot ;
- les abréviations, références locales et jeux de mots sont signalés ;
- une définition élégante doit produire un déclic, pas une résignation.

### Expérience de résolution

- la difficulté reste cohérente ;
- les croisements apportent une information utile ;
- le thème enrichit la grille sans transformer toutes les réponses en devinettes privées ;
- le joueur peut progresser sans devoir deviner aveuglément ;
- les erreurs du joueur doivent rester compréhensibles et récupérables.

## Fonction objectif

La qualité est multidimensionnelle. Aucun score unique ne doit masquer les arbitrages entre :

- taux de placement ;
- nombre de croisements ;
- compacité ;
- diversité lexicale ;
- fidélité au thème ;
- qualité des définitions ;
- difficulté ;
- plaisir de résolution.

Cruciverbalis devra conserver les composantes du score séparément et, à terme, comparer des candidats sur un front de Pareto plutôt que prétendre qu'une seule métrique résume la qualité.

## Limite explicite

Le moteur structurel ne décide pas seul qu'une grille est bonne. Il garantit qu'elle est valide. La qualité éditoriale relève d'une évaluation distincte, potentiellement assistée par Delibra et confirmée par des retours humains.
