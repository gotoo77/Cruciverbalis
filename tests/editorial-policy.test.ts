import { describe, expect, it } from 'vitest';
import { createEmptyGrid, placeEntry } from '../src/core/grid';
import type { Entry } from '../src/core/domain';
import { measureGridQuality } from '../src/quality/grid-quality';
import {
  EDITORIAL_POLICIES,
  rankByEditorialPolicy,
  type EditorialPolicy,
} from '../src/editorial/editorial-policy';

function horizontal(answer: string) {
  const entry: Entry = { answer };
  const result = placeEntry(createEmptyGrid(), {
    entry,
    start: { row: 0, col: 0 },
    direction: 'across',
  });
  if (!result.ok) throw new Error(`invalid fixture: ${result.code}`);
  return { grid: result.grid, quality: measureGridQuality(result.grid) };
}

describe('editorial policies', () => {
  it('ranks lexicographically according to explicit ordered preferences', () => {
    const short = horizontal('CHAT');
    const long = horizontal('TACHES');
    const policy: EditorialPolicy = {
      schema: 'cruciverbalis.editorial-policy.v1',
      id: 'prefer-narrow',
      name: 'Préférence étroite',
      version: 1,
      description: 'Fixture explicite.',
      preferences: [
        { metric: 'width', prefer: 'lower' },
        { metric: 'exposedEdges', prefer: 'lower' },
      ],
    };

    const ranking = rankByEditorialPolicy([long, short], policy);

    expect(ranking.ranked.map(({ originalIndex }) => originalIndex)).toEqual([1, 0]);
    expect(ranking.ranked[0]?.criteria[0]).toMatchObject({ value: 4, distance: 4 });
  });

  it('supports target preferences without inventing weights', () => {
    const four = horizontal('CHAT');
    const six = horizontal('TACHES');
    const policy: EditorialPolicy = {
      schema: 'cruciverbalis.editorial-policy.v1',
      id: 'target-five',
      name: 'Cible cinq',
      version: 1,
      description: 'Préfère une largeur proche de cinq.',
      preferences: [{ metric: 'width', prefer: 'target', target: 5 }],
    };

    const ranking = rankByEditorialPolicy([four, six], policy);

    expect(ranking.ranked).toHaveLength(2);
    expect(ranking.tieGroupCount).toBe(1);
    expect(ranking.ranked.map(({ originalIndex }) => originalIndex)).toEqual([0, 1]);
  });

  it('ships versioned presets with distinct editorial points of view', () => {
    expect(EDITORIAL_POLICIES.balanced.schema).toBe('cruciverbalis.editorial-policy.v1');
    expect(EDITORIAL_POLICIES.compactNetwork.preferences[0]).toMatchObject({
      metric: 'graphDiameter',
      prefer: 'lower',
    });
    expect(EDITORIAL_POLICIES.exploratory.preferences[0]).toMatchObject({
      metric: 'graphDiameter',
      prefer: 'higher',
    });
  });

  it('rejects ambiguous duplicate preferences', () => {
    const invalid: EditorialPolicy = {
      schema: 'cruciverbalis.editorial-policy.v1',
      id: 'invalid',
      name: 'Invalide',
      version: 1,
      description: 'La même dimension apparaît deux fois.',
      preferences: [
        { metric: 'width', prefer: 'lower' },
        { metric: 'width', prefer: 'higher' },
      ],
    };

    expect(() => rankByEditorialPolicy([horizontal('CHAT')], invalid)).toThrow(
      'duplicate editorial preference: width',
    );
  });
});
