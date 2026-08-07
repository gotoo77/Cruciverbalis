import type { ClueSet } from '../artifacts/clue-set';
import { createDerivationRecord, type DerivationRecord } from '../artifacts/derivation-record';
import type { EditorialLockSet } from '../artifacts/editorial-lock-set';
import type { Lexicon } from '../artifacts/lexicon';
import { wordSetToEntries, type WordSet } from '../artifacts/word-set';
import { generate, type GenerationRequest, type GenerationResult } from './generate';

export interface CrosswordDerivationArtifacts {
  readonly wordSet: WordSet;
  readonly clueSet?: ClueSet;
  readonly lexicon?: Lexicon;
  readonly editorialLocks?: EditorialLockSet;
}

export interface DeriveCrosswordRequest {
  readonly derivationId: string;
  /** Identifiant de l'artefact que l'appelant produira à partir du résultat. */
  readonly outputArtifactId: string;
  readonly artifacts: CrosswordDerivationArtifacts;
  readonly generation?: Omit<GenerationRequest, 'entries' | 'editorialLocks'>;
  readonly createdAt?: string;
}

export interface TraceableCrosswordDerivation {
  readonly generation: GenerationResult;
  readonly derivation: DerivationRecord;
}

/**
 * Frontière de provenance : contrairement à generate(), cette opération reçoit
 * les artefacts identifiés qui participent réellement à la dérivation. Elle ne
 * devine aucun identifiant et n'attribue aucune source absente de l'appel.
 */
export function deriveCrossword(request: DeriveCrosswordRequest): TraceableCrosswordDerivation {
  const { artifacts } = request;
  const generationRequest: GenerationRequest = {
    entries: wordSetToEntries(artifacts.wordSet),
    ...request.generation,
    editorialLocks: artifacts.editorialLocks,
  };
  const result = generate(generationRequest);
  const strategy = generationRequest.strategy ?? 'backtracking';

  const sources = [
    { kind: 'word-set' as const, artifactId: artifacts.wordSet.id },
    ...(artifacts.clueSet ? [{ kind: 'clue-set' as const, artifactId: artifacts.clueSet.id }] : []),
    ...(artifacts.lexicon ? [{ kind: 'lexicon' as const, artifactId: artifacts.lexicon.id }] : []),
  ];

  return {
    generation: result,
    derivation: createDerivationRecord({
      id: request.derivationId,
      outputArtifactId: request.outputArtifactId,
      sources,
      editorialLockSetId: artifacts.editorialLocks?.id,
      generation: {
        strategy,
        maxNodes: generationRequest.maxNodes,
        entryOrdering: generationRequest.entryOrdering,
        branchAndBound: generationRequest.branchAndBound,
      },
      createdAt: request.createdAt,
    }),
  };
}
