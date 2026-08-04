export {
  generate,
  type GeneratedGrid,
  type GenerationRequest,
  type GenerationResult,
  type GenerationStrategy,
} from './generate';

export {
  analyzeParetoFront,
  gridQualitySignature,
  type ParetoFrontAnalysis,
  type ParetoQualityFamily,
} from '../quality/pareto-analysis';

export type { Entry } from '../core/domain';
export type { GridQuality } from '../quality/grid-quality';
