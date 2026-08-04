import { describe, expect, it } from 'vitest';
import { generate } from '../src/api';

describe('public generation API', () => {
  const entries = [
    { answer: 'MAISON' },
    { answer: 'SOURIS' },
    { answer: 'RAISON' },
    { answer: 'MARS' },
  ];

  it('uses backtracking by default and exposes one measured solution', () => {
    const result = generate({ entries });

    expect(result.strategy).toBe('backtracking');
    expect(result.solutions).toHaveLength(1);
    expect(result.solutions[0]?.quality.placedEntries).toBe(
      result.solutions[0]?.grid.placements.length,
    );
    expect(result.search).toBeDefined();
  });

  it('exposes greedy generation without search metrics', () => {
    const result = generate({ entries, strategy: 'greedy' });

    expect(result.strategy).toBe('greedy');
    expect(result.solutions).toHaveLength(1);
    expect(result.search).toBeUndefined();
    expect(result.truncated).toBe(false);
  });

  it('exposes every non-dominated Pareto solution through the same contract', () => {
    const result = generate({ entries, strategy: 'pareto' });

    expect(result.strategy).toBe('pareto');
    expect(result.solutions.length).toBeGreaterThan(0);
    expect(result.search?.paretoCandidates).toBeGreaterThan(0);
    expect(result.solutions.every((solution) => solution.quality.placedEntries === solution.grid.placements.length)).toBe(true);
  });

  it('forwards the search budget without leaking solver-specific result shapes', () => {
    const result = generate({ entries, strategy: 'backtracking', maxNodes: 1 });

    expect(result.truncated).toBe(true);
    expect(result.search?.nodesExplored).toBe(1);
    expect(result.solutions).toHaveLength(1);
  });
});
