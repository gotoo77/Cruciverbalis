# WordSet v1

`WordSet` is the versioned input artifact for crossword generation. It contains candidate answers and descriptive metadata, but deliberately contains no clues and no grid geometry.

```json
{
  "schema": "cruciverbalis.word-set.v1",
  "id": "linux-fr-v1",
  "name": "Linux",
  "language": "fr",
  "description": "Un petit ensemble pour explorer un thème informatique.",
  "license": "CC0-1.0",
  "author": "Cruciverbalis",
  "entries": [
    { "answer": "LINUX", "theme": "informatique", "difficulty": 1 },
    { "answer": "NOYAU", "theme": "informatique", "difficulty": 2 }
  ],
  "provenance": {
    "createdBy": "cruciverbalis",
    "source": "built-in-preset"
  }
}
```

## Public API

- `validateWordSet(value)` validates an already parsed value without throwing.
- `parseWordSetJson(json)` parses and validates JSON without throwing.
- `serializeWordSet(wordSet)` emits canonical, indented JSON.
- `wordSetToEntries(wordSet)` adapts the artifact to the existing generation API.
- `WORD_SET_PRESETS` exposes deterministic built-in datasets.

The normative JSON Schema is published at `artifacts/word-set.v1.schema.json`.

## Boundaries

A `WordSet` contains answers only. Definitions and other clue forms will live in a separate `ClueSet` artifact so the same vocabulary can be combined with several editorial experiences.

Provenance is optional in v1, but when present it records where the artifact came from. It never changes solver behaviour.
