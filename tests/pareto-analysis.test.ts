import { describe, expect, it } from 'vitest';
import { analyzeParetoFront, gridQualitySignature, type GridQuality } from '../src/api';

function quality(
  placedEntries: number,
  crossings: number,
  area: number,
  density: number,
  directionBalance: number,
): GridQuality {
  return { placedEntries, crossings, area, density, directionBalance };
}

describe('Pareto front analysis', () => {
  it('groups solutions that share exactly the same quality vector', () => {
    const first = { id: 'a', quality: quality(8, 7, 100, 0.4, 1) };
    const second = { id: 'b', quality: quality(8, 7, 100, 0.4, 1) };
    const third = { id: 'c', quality: quality(8, 8, 112, 0.42, 0.75) };

    const analysis = analyzeParetoFront([first, second, third]);

    expect(analysis.solutionCount).toBe(3);
    expect(analysis.qualityProfileCount).toBe(2);
    expect(analysis.repeatedQualityProfileCount).toBe(1);
    expect(analysis.solutionsInRepeatedProfiles).toBe(2);
    expect(analysis.largestQualityFamilySize).toBe(2);
    expect(analysis.families[0]?.solutions.map(({ id }) => id)).toEqual(['a', 'b']);
  });

  it('does not turn equal metrics into solution equivalence', () => {
    const sharedQuality = quality(8, 7, 100, 0.4, 1);
    const first = { id: 'geometry-a', quality: sharedQuality };
    const second = { id: 'geometry-b', quality: { ...sharedQuality } };

    const analysis = analyzeParetoFront([first, second]);

    expect(analysis.solutionCount).toBe(2);
    expect(analysis.qualityProfileCount).toBe(1);
    expect(analysis.families[0]?.solutions).toHaveLength(2);
  });

  it('handles an empty front', () => {
    const analysis = analyzeParetoFront([]);

    expect(analysis).toMatchObject({
      solutionCount: 0,
      qualityProfileCount: 0,
      repeatedQualityProfileCount: 0,
      solutionsInRepeatedProfiles: 0,
      largestQualityFamilySize: 0,
    });
    expect(analysis.families).toEqual([]);
  });

  it('uses every current quality dimension in the signature', () => {
    const base = quality(8, 7, 100, 0.4, 1);
    const variants = [
      quality(7, 7, 100, 0.4, 1),
      quality(8, 8, 100, 0.4, 1),
      quality(8, 7, 101, 0.4, 1),
      quality(8, 7, 100, 0.41, 1),
      quality(8, 7, 100, 0.4, 0.75),
    ];

    expect(new Set([gridQualitySignature(base), ...variants.map(gridQualitySignature)]).size).toBe(6);
  });
});
