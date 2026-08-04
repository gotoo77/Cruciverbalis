import { describe, expect, it } from 'vitest';
import { createEmptyGrid, placeEntry } from '../src/core/grid';
import type { Entry } from '../src/core/domain';
import { measureGridQuality } from '../src/quality/grid-quality';
import {
  explainEditorialDecision,
  explainParetoRelation,
  type EditorialPolicy,
} from '../src/api';

function horizontal(answer: string) {
  const entry: Entry = { answer };
  const placed = placeEntry(createEmptyGrid(), {
    entry,
    start: { row: 0, col: 0 },
    direction: 'across',
  });
  if (!placed.ok) throw new Error(placed.code);
  return { grid: placed.grid, quality: measureGridQuality(placed.grid) };
}

const narrowPolicy: EditorialPolicy = {
  schema: 'cruciverbalis.editorial-policy.v1',
  id: 'narrow',
  name: 'Étroite',
  version: 1,
  description: 'Fixture.',
  preferences: [{ metric: 'width', prefer: 'lower' }],
};

describe('decision explanations', () => {
  it('names the first decisive editorial criterion', () => {
    const explanation = explainEditorialDecision(
      [horizontal('TACHES'), horizontal('CHAT')],
      narrowPolicy,
    );

    expect(explanation).toMatchObject({
      kind: 'editorial',
      winnerIndex: 1,
      comparedIndex: 0,
      decisiveCriterionIndex: 0,
    });
    expect(explanation?.message).toContain('largeur');
  });

  it('reports an editorial tie without inventing a reason', () => {
    const explanation = explainEditorialDecision(
      [horizontal('CHAT'), horizontal('LOUP')],
      narrowPolicy,
    );

    expect(explanation?.decisiveCriterionIndex).toBeUndefined();
    expect(explanation?.message).toContain('à égalité');
  });

  it('explains Pareto incomparability in both directions', () => {
    const relation = explainParetoRelation(
      { placedEntries: 5, crossings: 2, area: 20, density: 0.5, directionBalance: 0.8 },
      { placedEntries: 4, crossings: 3, area: 18, density: 0.6, directionBalance: 0.7 },
    );

    expect(relation.relation).toBe('incomparable');
    expect(relation.leftAdvantages).toContain('placedEntries');
    expect(relation.rightAdvantages).toContain('crossings');
  });
});
