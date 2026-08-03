# Cruciverbalis

**Forge open source de mots croisés de qualité.**

Cruciverbalis vise à générer, évaluer et éditer des grilles agréables à résoudre — sans sacrifier la qualité éditoriale au remplissage complet.

> Une bonne grille incomplète vaut mieux qu'une grille pleine de bouche-trous.

## Tranche actuelle

La première tranche fournit déjà :

- une application web statique en TypeScript ;
- un premier moteur déterministe de placement par croisements ;
- la normalisation des réponses françaises ;
- le rejet explicite des mots impossibles à placer ;
- un score initial fondé sur les mots placés, les croisements, la compacité et les rejets ;
- des tests automatisés et une CI GitHub Actions.

Le solveur actuel est volontairement simple et glouton. Il sert de base vérifiable avant l'introduction d'un vrai backtracking, de plusieurs candidats et d'une fonction de qualité plus riche.

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

## Principes

1. Aucune invention de mot pour compléter une grille.
2. Les contraintes structurelles sont vérifiées par du code déterministe.
3. La qualité des définitions sera traitée séparément de la validité de la grille.
4. Les échecs doivent être expliqués : mots non placés, contraintes incompatibles, compromis possibles.
5. Delibra pourra ultérieurement intervenir comme moteur facultatif de critique et de raffinement éditorial.

## Feuille de route

- **0.1** — premier moteur déterministe et interface web ;
- **0.2** — backtracking, génération de plusieurs candidats et scoring configurable ;
- **0.3** — thèmes, import/export JSON et édition manuelle ;
- **0.4** — définitions, difficulté et retours de joueurs ;
- **0.5** — intégration facultative avec Delibra.

## Licence

À définir avant la première version publiée.
