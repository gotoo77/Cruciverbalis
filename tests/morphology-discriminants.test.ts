import { describe, expect, it } from 'vitest';
import {
  analyzeMorphologyObservations,
  type GridMorphology,
  type GridQuality,
} from '../src/api';

const quality = (area: number): GridQuality => ({
  placedEntries: 8,
  crossings: 7,
  area,
  density: 0.4,
  directionBalance: 1,
});

const morphology = (overrides: Partial<GridMorphology> = {}): GridMorphology => ({
  width: 10,
  height: 10,
  aspectRatio: 1,
  exposedEdges: 40,
  leafEntries: 4,
  maxEntryDegree: 3,
  graphDiameter: 4,
  ...overrides,
});

describe('morphology discriminants', () => {
  it('counts only repeated GridQuality families', () => {
    const analysis = analyzeMorphologyObservations([
      { quality: quality(100), morphology: morphology() },
      { quality: quality(100), morphology: morphology({ graphDiameter: 5 }) },
      { quality: quality(120), morphology: morphology({ exposedEdges: 50 }) },
    ]);

    expect(analysis.repeatedQualityFamilyCount).toBe(1);
    expect(analysis.repeatedQualityFamiliesSplitByAnyMorphologyMetric).toBe(1);
  });

  it('ranks metrics by how often they split equal-quality families', () => {
    const analysis = analyzeMorphologyObservations([
      { quality: quality(100), morphology: morphology() },
      { quality: quality(100), morphology: morphology({ graphDiameter: 5, leafEntries: 5 }) },
      { quality: quality(120), morphology: morphology() },
      { quality: quality(120), morphology: morphology({ graphDiameter: 6 }) },
    ]);

    expect(analysis.discriminants[0]).toMatchObject({
      metric: 'graphDiameter',
      varyingQualityFamilies: 2,
      discriminationRate: 1,
      maxDistinctValuesInFamily: 2,
      maxSpread: 2,
    });
    expect(analysis.discriminants.find(({ metric }) => metric === 'leafEntries')).toMatchObject({
      varyingQualityFamilies: 1,
      discriminationRate: 0.5,
    });
  });

  it('reports zero discrimination when no quality profile repeats', () => {
    const analysis = analyzeMorphologyObservations([
      { quality: quality(100), morphology: morphology() },
      { quality: quality(120), morphology: morphology({ width: 12 }) },
    ]);

    expect(analysis.repeatedQualityFamilyCount).toBe(0);
    expect(analysis.repeatedQualityFamiliesSplitByAnyMorphologyMetric).toBe(0);
    expect(analysis.discriminants.every((metric) => metric.discriminationRate === 0)).toBe(true);
    expect(analysis.discriminants.every((metric) => metric.maxDistinctValuesInFamily === 0)).toBe(true);
  });
});
