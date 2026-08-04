import { coordinateAt, coordinateKey, type DomainGrid } from '../core/domain';

export interface GridMorphology {
  readonly width: number;
  readonly height: number;
  readonly aspectRatio: number;
  readonly exposedEdges: number;
  readonly leafEntries: number;
  readonly maxEntryDegree: number;
  readonly graphDiameter: number;
}

function boundingDimensions(grid: DomainGrid): { width: number; height: number } {
  if (grid.cells.size === 0) return { width: 0, height: 0 };

  const coordinates = [...grid.cells.keys()].map((key) => {
    const [row = 0, col = 0] = key.split(',').map(Number);
    return { row, col };
  });
  const rows = coordinates.map(({ row }) => row);
  const cols = coordinates.map(({ col }) => col);

  return {
    width: Math.max(...cols) - Math.min(...cols) + 1,
    height: Math.max(...rows) - Math.min(...rows) + 1,
  };
}

function countExposedEdges(grid: DomainGrid): number {
  let exposed = 0;

  for (const key of grid.cells.keys()) {
    const [row = 0, col = 0] = key.split(',').map(Number);
    const neighbours = [
      `${row - 1},${col}`,
      `${row + 1},${col}`,
      `${row},${col - 1}`,
      `${row},${col + 1}`,
    ];
    exposed += neighbours.filter((neighbour) => !grid.cells.has(neighbour)).length;
  }

  return exposed;
}

function crossingAdjacency(grid: DomainGrid): readonly ReadonlySet<number>[] {
  const occupants = new Map<string, number[]>();

  grid.placements.forEach((placement, placementIndex) => {
    for (let index = 0; index < placement.entry.answer.length; index += 1) {
      const key = coordinateKey(coordinateAt(placement, index));
      const current = occupants.get(key);
      if (current) current.push(placementIndex);
      else occupants.set(key, [placementIndex]);
    }
  });

  const adjacency = Array.from({ length: grid.placements.length }, () => new Set<number>());
  for (const indices of occupants.values()) {
    if (indices.length < 2) continue;
    for (let left = 0; left < indices.length; left += 1) {
      for (let right = left + 1; right < indices.length; right += 1) {
        const leftIndex = indices[left];
        const rightIndex = indices[right];
        if (leftIndex === undefined || rightIndex === undefined) continue;
        adjacency[leftIndex]?.add(rightIndex);
        adjacency[rightIndex]?.add(leftIndex);
      }
    }
  }

  return adjacency;
}

function measureGraphDiameter(adjacency: readonly ReadonlySet<number>[]): number {
  let diameter = 0;

  for (let source = 0; source < adjacency.length; source += 1) {
    const distances = new Map<number, number>([[source, 0]]);
    const queue = [source];

    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const node = queue[cursor];
      if (node === undefined) continue;
      const distance = distances.get(node) ?? 0;
      for (const neighbour of adjacency[node] ?? []) {
        if (distances.has(neighbour)) continue;
        distances.set(neighbour, distance + 1);
        queue.push(neighbour);
      }
    }

    for (const distance of distances.values()) diameter = Math.max(diameter, distance);
  }

  return diameter;
}

/**
 * Measures geometry and crossing-graph structure without changing Pareto dominance.
 * These values are observations, not optimisation objectives.
 */
export function measureGridMorphology(grid: DomainGrid): GridMorphology {
  const { width, height } = boundingDimensions(grid);
  const shortestSide = Math.min(width, height);
  const longestSide = Math.max(width, height);
  const adjacency = crossingAdjacency(grid);
  const degrees = adjacency.map((neighbours) => neighbours.size);

  return {
    width,
    height,
    aspectRatio: shortestSide === 0 ? 0 : longestSide / shortestSide,
    exposedEdges: countExposedEdges(grid),
    leafEntries: degrees.filter((degree) => degree === 1).length,
    maxEntryDegree: degrees.length === 0 ? 0 : Math.max(...degrees),
    graphDiameter: measureGraphDiameter(adjacency),
  };
}

export function gridMorphologySignature(morphology: GridMorphology): string {
  return [
    morphology.width,
    morphology.height,
    morphology.aspectRatio,
    morphology.exposedEdges,
    morphology.leafEntries,
    morphology.maxEntryDegree,
    morphology.graphDiameter,
  ].join('|');
}
