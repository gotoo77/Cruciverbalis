# Cruciverbalis

**Forge open source locale de mots croisés jouables.**

Cruciverbalis construit, évalue, complète, inspecte et publie des grilles de mots croisés sans sacrifier la qualité au remplissage complet.

> Une bonne grille incomplète vaut mieux qu'une grille pleine de bouche-trous.

## Où en est le projet ?

Cruciverbalis n'est plus un prototype de solveur. La chaîne verticale actuelle est déjà presque complète :

```text
WordSet + ClueSet + Lexicon
        ↓
génération thématique
        ↓
front de Pareto / préférences éditoriales
        ↓
FillPass
        ↓
inspection + couverture des indices + preflight
        ↓
PlayableCrossword
        ↓
export / jeu
        ↓
SolveFeedback
```

Le cœur fournit notamment : solveur déterministe, backtracking, MRV, Branch & Bound scalaire, forward checking, caches bornés, benchmarks et observabilité ; qualité multidimensionnelle sans score global magique ; front de Pareto, déduplication et caractérisation ; préférences éditoriales explicites ; artefacts versionnés `WordSet`, `ClueSet`, `Lexicon`, `PlayableCrossword` et `SolveFeedback` ; FillPass lexical ; import Lexique 4 ; contrôle de couverture des indices et preflight bloquant avant publication.

La démo web fonctionne localement dans le navigateur, sans backend.

## Principes de conception

1. **Pas de remplissage mensonger.** Aucun mot n'est inventé pour boucher un trou.
2. **Le déterministe vérifie le structurel.** Les contraintes calculables restent du code.
3. **La qualité est multidimensionnelle.** Aucun score magique ne décide seul de la meilleure grille.
4. **Les compromis restent visibles.** Le front de Pareto conserve les solutions non dominées.
5. **Les échecs sont observables.** Budgets, backtracks, branches élaguées, caches et diagnostics restent inspectables.
6. **Le lexical et l'éditorial sont séparés.** `WordSet` fournit le matériau thématique ; `ClueSet` fournit les contenus destinés au joueur.
7. **L'humain possède l'autorité éditoriale finale.** Une décision explicitement verrouillée par le verbicruciste doit devenir une contrainte durable du moteur.

Voir [`docs/QUALITY.md`](docs/QUALITY.md) et [`docs/API.md`](docs/API.md).

## Architecture : proposer, décider, dériver

Le moteur produit des propositions déterministes et explicables. L'étape suivante consiste à représenter les décisions humaines séparément de la grille dérivée :

```text
artefacts sources
      ↓
proposition machine
      ↓
décisions éditoriales humaines
      ↓
régénération contrainte
      ↓
nouveau front / nouvelle grille
```

Une amélioration algorithmique ne doit jamais écraser silencieusement une décision humaine verrouillée. Si les contraintes deviennent incompatibles, le moteur doit l'expliquer et échouer explicitement.

## Démo

https://gotoo77.github.io/Cruciverbalis/

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

### Maintenant — autorité éditoriale humaine

- introduire un artefact versionné de décisions/verrous éditoriaux séparé de `PlayableCrossword` ;
- verrouiller explicitement des placements et, ensuite, des choix d'indices ou autres décisions éditoriales ;
- préserver la provenance de chaque décision humaine ;
- faire respecter ces contraintes lors d'une régénération ou d'un FillPass ;
- refuser explicitement une dérivation incompatible plutôt que modifier silencieusement un verrou ;
- exposer dans l'atelier une édition manuelle permettant au verbicruciste de reprendre la main sans recommencer la grille.

### Ensuite — boucle durable de retours joueurs

- agréger plusieurs `SolveFeedback` sans perdre les observations individuelles ;
- distinguer faits observés, préférences et interprétations ;
- réinjecter explicitement les enseignements retenus dans le processus éditorial ;
- conserver la traçabilité entre feedback, décision humaine et nouvelle dérivation.

### Recherche algorithmique

- étudier des bornes multicritères réellement sûres pour la recherche Pareto ;
- continuer à caractériser les compromis qualité / coût de recherche ;
- ne jamais introduire une optimisation qui change silencieusement la sémantique du solveur.

### Plus tard — Delibra comme verbicruciste critique

Delibra reste facultatif. Il pourra orchestrer critique, comparaison et raffinement, mais ne doit ni devenir le solveur géométrique ni l'autorité éditoriale finale.

## Ce que Cruciverbalis ne veut pas devenir

- un générateur qui remplit à tout prix avec des réponses douteuses ;
- une boîte noire où un score opaque décide seul ;
- un prétexte pour déléguer au LLM des contraintes déterministes ;
- un système où une optimisation automatique peut annuler silencieusement une décision humaine ;
- un projet couplé à Delibra au point de rendre son moteur inutilisable indépendamment.

## Licence

À définir avant la première version publiée.
