# Cruciverbalis

**Forge open source de mots croisés de qualité.**

Cruciverbalis construit et évalue des grilles de mots croisés sans sacrifier la qualité au remplissage complet.

> Une bonne grille incomplète vaut mieux qu'une grille pleine de bouche-trous.

## Où en est le projet ?

Cruciverbalis n'est plus un simple prototype glouton. Le cœur actuel fournit :

- un modèle déterministe de grille et des invariants structurels testés ;
- un solveur glouton rapide servant notamment de référence ;
- une recherche récursive par backtracking ;
- l'heuristique MRV (*Minimum Remaining Values*) pour choisir les entrées les plus contraintes ;
- du Branch & Bound pour élaguer les branches qui ne peuvent plus améliorer l'objectif du solveur classique ;
- un budget de nœuds explicite et des métriques de recherche ;
- un modèle de qualité multidimensionnel : placements, croisements, aire, densité et équilibre horizontal/vertical ;
- une dominance de Pareto sans score global arbitraire ;
- une recherche capable de conserver un front de solutions non dominées ;
- une API publique `generate(...)` qui isole les consommateurs des solveurs internes ;
- une démo web statique responsive publiée avec GitHub Pages ;
- des benchmarks reproductibles, des tests automatisés et une CI GitHub Actions.

La démo permet déjà de comparer concrètement les stratégies gloutonne, backtracking et Pareto, d'observer leurs grilles et d'inspecter leurs métriques.

## Principes de conception

1. **Pas de remplissage mensonger.** Aucun mot n'est inventé pour boucher un trou. Une entrée impossible à placer reste explicitement non placée.
2. **Le déterministe vérifie le structurel.** Compatibilité des lettres, croisements, voisinages et validité géométrique relèvent du code, pas d'un modèle probabiliste.
3. **La qualité est multidimensionnelle.** Cruciverbalis ne prétend pas qu'un score magique peut décider combien vaut un croisement par rapport à dix cases d'aire.
4. **Les compromis restent visibles.** Lorsque plusieurs grilles sont non dominées, le front de Pareto les conserve au lieu de fabriquer artificiellement une gagnante.
5. **Les échecs sont observables.** Mots non placés, budget épuisé, backtracks, branches élaguées et autres métriques doivent permettre de comprendre le comportement du moteur.
6. **La qualité éditoriale est distincte de la validité structurelle.** Une grille valide n'est pas automatiquement une bonne grille à résoudre.
7. **L'humain reste l'arbitre final de l'expérience.** Les métriques et les critiques assistent le jugement ; elles ne le remplacent pas.

Voir [`docs/QUALITY.md`](docs/QUALITY.md) pour le modèle de qualité et [`docs/API.md`](docs/API.md) pour la façade publique.

## Architecture : construire, puis critiquer

Le cœur de Cruciverbalis doit rester utilisable seul. Il construit des grilles, vérifie leurs contraintes et mesure ce qu'il sait mesurer objectivement.

Une extension future pourra connecter **Delibra** comme couche facultative d'orchestration éditoriale. La séparation visée est volontaire :

```text
thème / intention
       ↓
vocabulaire candidat
       ↓
Cruciverbalis
  construction + contraintes + mesures
       ↓
solutions / front de Pareto
       ↓
Delibra (facultatif)
  critique + comparaison + raffinement
       ↓
retour humain
       ↓
grille et définitions raffinées
```

Delibra ne doit donc pas devenir le solveur géométrique. Il pourra plutôt orchestrer des critiques telles que : cohérence du thème, élégance et ambiguïté des définitions, difficulté, présence de bouche-trous, intérêt d'une solution Pareto ou retour d'un joueur. Ces critiques pourront devenir des artefacts traçables et être réinjectées dans un protocole de raffinement.

Cette intégration reste une ambition, pas une dépendance actuelle du moteur.

## Démo

La démo GitHub Pages est disponible sur :

https://gotoo77.github.io/Cruciverbalis/

Tout le calcul s'effectue localement dans le navigateur, sans backend.

## Développement

```bash
npm install
npm run dev
```

Validation :

```bash
npm test
npm run build
```

## Feuille de route

La roadmap n'est plus organisée autour de numéros de versions prédits trop tôt. Elle suit désormais les questions que le projet doit résoudre.

### Maintenant — comprendre les solutions que nous produisons

- caractériser le front de Pareto observé dans la démo ;
- identifier et dédupliquer les solutions équivalentes ou redondantes ;
- distinguer équivalence géométrique, mêmes métriques et véritable diversité de compromis ;
- déterminer quelles propriétés morphologiques importantes ne sont pas encore capturées par `GridQuality` ;
- conserver des benchmarks qui rendent les évolutions du solveur comparables.

### Ensuite — enrichir la notion de bonne grille

- étudier la compacité morphologique, la topologie des croisements et d'autres critères explicables ;
- permettre des préférences éditoriales explicites sans les confondre avec des propriétés objectives ;
- améliorer l'exploration multicritère et, si possible, introduire des bornes Pareto sûres ;
- exposer dans la démo des outils de comparaison plus utiles qu'une simple navigation séquentielle.

### Puis — passer des mots à l'expérience de mots croisés

- thèmes et vocabulaires candidats ;
- import/export d'artefacts JSON ;
- édition manuelle et verrouillage de choix humains ;
- définitions et niveaux de difficulté ;
- retours de joueurs et critères d'expérience de résolution.

### Plus tard — Delibra comme verbicruciste critique

- protocole facultatif de génération, critique et raffinement éditorial ;
- comparaison argumentée de plusieurs solutions du front ;
- critique des définitions, du thème et de la difficulté ;
- réinjection de retours humains sous forme d'artefacts ;
- expérimentation sur la co-construction humain + moteur déterministe + agents critiques.

## Ce que Cruciverbalis ne veut pas devenir

- un générateur qui remplit à tout prix avec des réponses douteuses ;
- une boîte noire où un score opaque décide seul de la meilleure grille ;
- un prétexte pour déléguer au LLM des contraintes que des algorithmes déterministes savent vérifier ;
- un projet couplé à Delibra au point de rendre son moteur inutilisable indépendamment.

## Licence

À définir avant la première version publiée.
