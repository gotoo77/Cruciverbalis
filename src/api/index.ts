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

export {
  gridMorphologySignature,
  measureGridMorphology,
  type GridMorphology,
} from '../quality/grid-morphology';

export {
  analyzeParetoMorphology,
  type ParetoMorphologyAnalysis,
  type ParetoMorphologyFamily,
} from '../quality/pareto-morphology';

export {
  analyzeMorphologyObservations,
  analyzeParetoMorphologyDiscriminants,
  type MorphologyDiscriminant,
  type MorphologyDiscriminantAnalysis,
  type MorphologyMetric,
  type MorphologyObservation,
} from '../quality/morphology-discriminants';

export type { Entry } from '../core/domain';
export type { GridQuality } from '../quality/grid-quality';
