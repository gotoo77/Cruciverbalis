# ClueSet v1

`cruciverbalis.clue-set.v1` separates crossword clues from the geometric `WordSet` input.

A `WordSet` answers the question **which answers may be placed?** A `ClueSet` answers **how may those answers be clued?** The same answer may therefore have several clues with different styles or difficulty levels without changing the generated grid.

## Clue kinds

The v1 vocabulary is intentionally explicit and finite:

- `definition` — direct definition;
- `synonym` — synonym or near-synonym;
- `analogy` — clue based on a semantic relationship or comparison;
- `wordplay` — pun, double meaning or playful formulation;
- `historical` — clue grounded in historical context;
- `quote` — quotation-based clue;
- `phonetic` — pronunciation or sound-based clue;
- `cryptic` — cryptic-crossword style clue;
- `etymology` — origin or history of the word.

Kinds describe editorial intent. They do not imply that one kind is intrinsically better than another.

## Example

```json
{
  "schema": "cruciverbalis.clue-set.v1",
  "id": "fruit-fr-v1",
  "name": "Fruits FR",
  "language": "fr",
  "clues": [
    {
      "id": "pasteque-definition",
      "answer": "PASTÈQUE",
      "kind": "definition",
      "text": "Gros fruit à chair rouge et riche en eau.",
      "difficulty": 1
    },
    {
      "id": "pasteque-wordplay",
      "answer": "PASTÈQUE",
      "kind": "wordplay",
      "text": "Elle a le cœur rouge mais ne bat jamais.",
      "difficulty": 3
    }
  ]
}
```

## Optional metadata

A clue may carry `source`, a `confidence` value between 0 and 1, and free-form `tags`. These fields describe provenance or curation state; they are not scores used by the solver.

`difficulty` is an editorial annotation from 1 to 5. Cruciverbalis does not infer player ability from it.

## Independence from generation

`ClueSet` does not affect placement, MRV, Branch & Bound, Pareto dominance, morphology or editorial grid ranking. It can be produced manually, by another application, or later by Delibra/LLM-assisted workflows, while the crossword engine remains deterministic and independent of those producers.

The canonical JSON Schema is `artifacts/clue-set.v1.schema.json`.
