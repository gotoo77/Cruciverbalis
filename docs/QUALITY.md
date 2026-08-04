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

Cruciverbalis conserve donc les composantes séparément au lieu de les écraser trop tôt dans une somme pondérée.

### Dimensions structurelles mesurées

La première version de `GridQuality` expose uniquement des propriétés objectives de la géométrie :

- `placedEntries` : nombre de réponses placées, à maximiser ;
- `crossings` : nombre de cases réellement croisées, à maximiser ;
- `area` : aire de la boîte englobante, à minimiser ;
- `density` : proportion de cases occupées dans cette boîte, à maximiser ;
- `directionBalance` : équilibre entre réponses horizontales et verticales, à maximiser.

Aucune pondération n'est définie à ce stade. Dire que « +1 croisement vaut -3 cases d'aire » serait une préférence éditoriale arbitraire, pas une propriété du domaine.

### Dominance et front de Pareto

Une grille A domine une grille B si A n'est moins bonne sur aucun objectif et est strictement meilleure sur au moins un. Deux grilles peuvent donc être toutes deux pertinentes lorsqu'elles réalisent des compromis différents.

Exemple : une grille peut placer un mot de plus mais être plus étalée, tandis qu'une autre peut être plus compacte et mieux croisée. Tant qu'aucune préférence éditoriale explicite ne tranche ce compromis, Cruciverbalis doit conserver les deux sur le front de Pareto plutôt que prétendre qu'un score magique désigne une gagnante absolue.

## Limite explicite

Le moteur structurel ne décide pas seul qu'une grille est bonne. Il garantit qu'elle est valide et mesure quelques propriétés objectives. La qualité lexicale, éditoriale et le plaisir de résolution relèvent d'une évaluation distincte, potentiellement assistée par Delibra et confirmée par des retours humains.
