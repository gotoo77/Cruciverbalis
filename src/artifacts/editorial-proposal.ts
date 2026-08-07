import type { Direction } from '../core/domain';

export const EDITORIAL_PROPOSAL_SCHEMA = 'cruciverbalis.editorial-proposal.v1' as const;

export type EditorialProposalStatus = 'pending' | 'accepted' | 'rejected';
export type EditorialProposalKind = 'review-clue' | 'review-word' | 'review-placement' | 'other';

export interface PlacementProposalPayload {
  readonly answer: string;
  readonly row: number;
  readonly col: number;
  readonly direction: Direction;
}

export type EditorialProposalPayload = PlacementProposalPayload;

export interface EditorialProposal {
  readonly schema: typeof EDITORIAL_PROPOSAL_SCHEMA;
  readonly id: string;
  readonly crosswordId: string;
  readonly sourceObservationIds: readonly string[];
  readonly kind: EditorialProposalKind;
  readonly summary: string;
  readonly status: EditorialProposalStatus;
  readonly rationale?: string;
  /** Données explicites permettant éventuellement une matérialisation mécanique. */
  readonly payload?: EditorialProposalPayload;
  readonly decidedBy?: string;
  readonly decidedAt?: string;
  readonly decisionNote?: string;
}

export interface CreateEditorialProposalOptions {
  readonly id: string;
  readonly crosswordId: string;
  readonly sourceObservationIds: readonly string[];
  readonly kind: EditorialProposalKind;
  readonly summary: string;
  readonly rationale?: string;
  readonly payload?: EditorialProposalPayload;
}

export interface DecideEditorialProposalOptions {
  readonly decidedBy: string;
  readonly decidedAt?: string;
  readonly decisionNote?: string;
}

export function createEditorialProposal(options: CreateEditorialProposalOptions): EditorialProposal {
  return {
    schema: EDITORIAL_PROPOSAL_SCHEMA,
    id: options.id,
    crosswordId: options.crosswordId,
    sourceObservationIds: [...options.sourceObservationIds],
    kind: options.kind,
    summary: options.summary,
    status: 'pending',
    rationale: options.rationale,
    payload: options.payload,
  };
}

function decideProposal(
  proposal: EditorialProposal,
  status: 'accepted' | 'rejected',
  options: DecideEditorialProposalOptions,
): EditorialProposal {
  if (proposal.status !== 'pending') throw new Error(`editorial proposal ${proposal.id} is already ${proposal.status}`);
  const decidedBy = options.decidedBy.trim();
  if (!decidedBy) throw new Error('decidedBy must identify the human decision maker');
  return { ...proposal, status, decidedBy, decidedAt: options.decidedAt, decisionNote: options.decisionNote?.trim() || undefined };
}

export function acceptEditorialProposal(proposal: EditorialProposal, options: DecideEditorialProposalOptions): EditorialProposal {
  return decideProposal(proposal, 'accepted', options);
}
export function rejectEditorialProposal(proposal: EditorialProposal, options: DecideEditorialProposalOptions): EditorialProposal {
  return decideProposal(proposal, 'rejected', options);
}
export function serializeEditorialProposal(proposal: EditorialProposal): string { return `${JSON.stringify(proposal, null, 2)}\n`; }
