import {
  EDITORIAL_LOCK_SET_SCHEMA,
  type EditorialLockSet,
} from '../artifacts/editorial-lock-set';
import type { EditorialProposal } from '../artifacts/editorial-proposal';

export type ProposalMaterializationFailureCode =
  | 'proposal-not-accepted'
  | 'proposal-not-executable'
  | 'proposal-payload-missing';

export interface ProposalMaterializationFailure {
  readonly ok: false;
  readonly code: ProposalMaterializationFailureCode;
  readonly message: string;
}

export interface ProposalMaterializationSuccess {
  readonly ok: true;
  readonly lockSet: EditorialLockSet;
}

export type ProposalMaterializationResult = ProposalMaterializationSuccess | ProposalMaterializationFailure;

export interface MaterializeProposalOptions {
  readonly lockSetId: string;
  readonly lockSetName: string;
}

/**
 * Matérialise uniquement ce qu'un humain a accepté ET explicitement spécifié.
 * Aucune interprétation du résumé, de la justification ou des observations.
 */
export function materializeAcceptedProposal(
  proposal: EditorialProposal,
  options: MaterializeProposalOptions,
): ProposalMaterializationResult {
  if (proposal.status !== 'accepted') {
    return { ok: false, code: 'proposal-not-accepted', message: `la proposition ${proposal.id} n'a pas été acceptée` };
  }
  if (proposal.kind !== 'review-placement') {
    return { ok: false, code: 'proposal-not-executable', message: `la proposition ${proposal.id} ne décrit pas une contrainte exécutable` };
  }
  if (!proposal.payload) {
    return { ok: false, code: 'proposal-payload-missing', message: `la proposition ${proposal.id} ne contient pas de placement explicite` };
  }

  return {
    ok: true,
    lockSet: {
      schema: EDITORIAL_LOCK_SET_SCHEMA,
      id: options.lockSetId,
      name: options.lockSetName,
      locks: [{
        kind: 'placement',
        answer: proposal.payload.answer,
        row: proposal.payload.row,
        col: proposal.payload.col,
        direction: proposal.payload.direction,
        reason: `proposition ${proposal.id} acceptée par ${proposal.decidedBy ?? 'humain identifié'}`,
      }],
    },
  };
}
