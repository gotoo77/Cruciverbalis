import { describe, expect, it } from 'vitest';
import { acceptEditorialProposal, createEditorialProposal, rejectEditorialProposal } from '../src/artifacts/editorial-proposal';
import { materializeAcceptedProposal } from '../src/editorial/materialize-proposal';

function placementProposal() {
  return createEditorialProposal({
    id: 'proposal-placement-001', crosswordId: 'crossword-001', sourceObservationIds: ['observation-001'],
    kind: 'review-placement', summary: 'Conserver CHAT à cet emplacement',
    payload: { answer: 'CHAT', row: 2, col: 3, direction: 'across' },
  });
}

const materialization = { lockSetId: 'locks-002', lockSetName: 'Décisions issues de revue humaine' };

describe('materializeAcceptedProposal', () => {
  it('materializes an explicitly accepted placement into an executable lock', () => {
    const accepted = acceptEditorialProposal(placementProposal(), { decidedBy: 'gotoo' });
    const result = materializeAcceptedProposal(accepted, materialization);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.lockSet.locks).toEqual([{ kind: 'placement', answer: 'CHAT', row: 2, col: 3, direction: 'across', reason: 'proposition proposal-placement-001 acceptée par gotoo' }]);
  });

  it('refuses a pending proposal', () => {
    expect(materializeAcceptedProposal(placementProposal(), materialization)).toMatchObject({ ok: false, code: 'proposal-not-accepted' });
  });

  it('refuses a rejected proposal', () => {
    const rejected = rejectEditorialProposal(placementProposal(), { decidedBy: 'gotoo' });
    expect(materializeAcceptedProposal(rejected, materialization)).toMatchObject({ ok: false, code: 'proposal-not-accepted' });
  });

  it('refuses to infer an executable decision from prose', () => {
    const accepted = acceptEditorialProposal(createEditorialProposal({
      id: 'proposal-clue-001', crosswordId: 'crossword-001', sourceObservationIds: ['observation-001'],
      kind: 'review-clue', summary: 'Revoir l’indice de CHAT', rationale: 'Le joueur le trouve obscur.',
    }), { decidedBy: 'gotoo' });
    expect(materializeAcceptedProposal(accepted, materialization)).toMatchObject({ ok: false, code: 'proposal-not-executable' });
  });

  it('refuses an accepted placement proposal without explicit placement data', () => {
    const accepted = acceptEditorialProposal(createEditorialProposal({
      id: 'proposal-placement-002', crosswordId: 'crossword-001', sourceObservationIds: [],
      kind: 'review-placement', summary: 'Conserver CHAT quelque part',
    }), { decidedBy: 'gotoo' });
    expect(materializeAcceptedProposal(accepted, materialization)).toMatchObject({ ok: false, code: 'proposal-payload-missing' });
  });
});
