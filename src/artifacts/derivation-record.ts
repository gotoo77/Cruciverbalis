import type { GenerationStrategy } from '../api/generate';
import type { EntryOrdering } from '../solver/backtracking';

export const DERIVATION_RECORD_SCHEMA = 'cruciverbalis.derivation-record.v1' as const;

export type DerivationSourceKind = 'word-set' | 'clue-set' | 'lexicon' | 'other';

export interface DerivationSourceRef {
  readonly kind: DerivationSourceKind;
  readonly artifactId: string;
}

export interface DerivationDecisionRef {
  readonly kind: 'editorial-lock-set';
  readonly artifactId: string;
}

export interface DerivationGenerationConfig {
  readonly strategy: GenerationStrategy;
  readonly maxNodes?: number;
  readonly entryOrdering?: EntryOrdering;
  readonly branchAndBound?: boolean;
}

/**
 * Trace factuelle d'une dérivation. Elle explique de quelles sources et
 * décisions un artefact est issu ; elle ne contient ni jugement éditorial,
 * ni feedback joueur, ni logique de workflow.
 */
export interface DerivationRecord {
  readonly schema: typeof DERIVATION_RECORD_SCHEMA;
  readonly id: string;
  readonly outputArtifactId: string;
  readonly sources: readonly DerivationSourceRef[];
  readonly decisions: readonly DerivationDecisionRef[];
  readonly generation: DerivationGenerationConfig;
  readonly createdAt?: string;
}

export interface CreateDerivationRecordOptions {
  readonly id: string;
  readonly outputArtifactId: string;
  readonly sources?: readonly DerivationSourceRef[];
  readonly editorialLockSetId?: string;
  readonly generation: DerivationGenerationConfig;
  readonly createdAt?: string;
}

export function createDerivationRecord(options: CreateDerivationRecordOptions): DerivationRecord {
  return {
    schema: DERIVATION_RECORD_SCHEMA,
    id: options.id,
    outputArtifactId: options.outputArtifactId,
    sources: [...(options.sources ?? [])],
    decisions: options.editorialLockSetId
      ? [{ kind: 'editorial-lock-set', artifactId: options.editorialLockSetId }]
      : [],
    generation: { ...options.generation },
    createdAt: options.createdAt,
  };
}

export function serializeDerivationRecord(record: DerivationRecord): string {
  return `${JSON.stringify(record, null, 2)}\n`;
}
