import { describe, expect, it } from 'vitest';
import {
  acceptEditorialProposal,
  createEditorialProposal,
  rejectEditorialProposal,
} from '../src/artifacts/editorial-proposal';

describe('EditorialProposal', () => {
  const proposal = () => createEditorialProposal({
    id: 'proposal-001',
    crosswordId: 'crossword-001',
    sourceObservationIds: ['observation-001'],
    kind: 'review-clue',
    summary: 'Envisager de revoir l’indice de CHAT',
    rationale: 'Une observation joueur signale un indice obscur.',
  });

  it('starts pending and carries no editorial authority by itself', () => {
    const value = proposal();
    expect(value.status).toBe('pending');
    expect(value.sourceObservationIds).toEqual(['observation-001']);
    expect(value).not.toHaveProperty('locks');
  });

  it('requires an explicit identified human acceptance', () => {
    const accepted = acceptEditorialProposal(proposal(), {
      decidedBy: 'gotoo',
      decidedAt: '2026-08-07T17:00:00Z',
      decisionNote: 'Oui, cet indice doit être retravaillé.',
    });
    expect(accepted.status).toBe('accepted');
    expect(accepted.decidedBy).toBe('gotoo');
    expect(accepted.decisionNote).toBe('Oui, cet indice doit être retravaillé.');
  });

  it('supports explicit rejection without mutating the proposal in place', () => {
    const pending = proposal();
    const rejected = rejectEditorialProposal(pending, { decidedBy: 'gotoo' });
    expect(pending.status).toBe('pending');
    expect(rejected.status).toBe('rejected');
  });

  it('refuses to silently overwrite a completed human decision', () => {
    const accepted = acceptEditorialProposal(proposal(), { decidedBy: 'gotoo' });
    expect(() => rejectEditorialProposal(accepted, { decidedBy: 'gotoo' })).toThrow(/already accepted/);
  });

  it('refuses anonymous decisions', () => {
    expect(() => acceptEditorialProposal(proposal(), { decidedBy: '   ' })).toThrow(/decidedBy/);
  });
});
