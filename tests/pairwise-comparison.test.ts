import { describe, expect, it } from 'vitest';
import { createEmptyGrid, placeEntry } from '../src/core/grid';
import type { Direction, DomainGrid, Entry } from '../src/core/domain';
import { measureGridQuality } from '../src/quality/grid-quality';
import {
  comparableSolutionId,
  createHumanComparisonArtifact,
  createHumanComparisonVote,
  createSameQualityComparisonPairs,
} from '../src/feedback/pairwise-comparison';

function gridWith(
  placements: readonly { entry: Entry; row: number; col: number; direction: Direction }[],
): DomainGrid {
  let grid = createEmptyGrid();
  for (const { entry, row, col, direction } of placements) {
    const result = placeEntry(grid, { entry, start: { row, col }, direction });
    if (!result.ok) throw new Error(`invalid test fixture: ${result.code}`);
    grid = result.grid;
  }
  return grid;
}

function solution(grid: DomainGrid) {
  return { grid, quality: measureGridQuality(grid) };
}

function sameQualityDifferentMorphologyPair() {
  const chat = { answer: 'CHAT' };
  const tache = { answer: 'TACHE' };
  const first = solution(gridWith([
    { entry: chat, row: 0, col: 0, direction: 'across' },
    { entry: tache, row: 0, col: 3, direction: 'down' },
  ]));

  // Keep the same declared GridQuality family while changing a morphology
  // dimension that the current observer actually measures: width 4 -> 5.
  const secondGrid = gridWith([
    { entry: tache, row: 0, col: 0, direction: 'across' },
  ]);
  const second = { grid: secondGrid, quality: first.quality };

  return { first, second };
}

describe('pairwise human comparison', () => {
  it('prioritizes different morphologies inside the same quality family', () => {
    const { first, second } = sameQualityDifferentMorphologyPair();
    const pairs = createSameQualityComparisonPairs([first, second]);

    expect(pairs).toHaveLength(1);
    expect(pairs[0]?.leftIndex).toBe(0);
    expect(pairs[0]?.rightIndex).toBe(1);
  });

  it('does not compare solutions from different quality families', () => {
    const chat = { answer: 'CHAT' };
    const first = solution(gridWith([{ entry: chat, row: 0, col: 0, direction: 'across' }]));
    const tache = { answer: 'TACHE' };
    const second = solution(gridWith([{ entry: tache, row: 0, col: 0, direction: 'across' }]));

    expect(createSameQualityComparisonPairs([first, second])).toEqual([]);
  });

  it('keeps solution identity invariant under translation', () => {
    const chat = { answer: 'CHAT' };
    const first = solution(gridWith([{ entry: chat, row: 0, col: 0, direction: 'across' }]));
    const translated = solution(gridWith([{ entry: chat, row: 8, col: -5, direction: 'across' }]));

    expect(comparableSolutionId(translated)).toBe(comparableSolutionId(first));
  });

  it('exports an explicit versioned feedback artifact', () => {
    const { first, second } = sameQualityDifferentMorphologyPair();
    const [pair] = createSameQualityComparisonPairs([first, second]);
    if (!pair) throw new Error('expected a comparison pair');

    const vote = createHumanComparisonVote(pair, 0, 'left');
    const artifact = createHumanComparisonArtifact([vote], '2026-08-04T08:00:00.000Z');

    expect(artifact).toMatchObject({
      schema: 'cruciverbalis.human-comparison.v1',
      createdAt: '2026-08-04T08:00:00.000Z',
      pairCount: 1,
    });
    expect(artifact.votes[0]?.decision).toBe('left');
    expect(artifact.votes[0]?.leftMorphology).toBeDefined();
  });
});
