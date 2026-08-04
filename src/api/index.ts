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

export {
  comparableSolutionId,
  createHumanComparisonArtifact,
  createHumanComparisonVote,
  createSameQualityComparisonPairs,
  type HumanComparisonArtifact,
  type HumanComparisonDecision,
  type HumanComparisonPair,
  type HumanComparisonVote,
} from '../feedback/pairwise-comparison';

export {
  analyzeHumanComparisonArtifact,
  analyzeHumanComparisonVotes,
  type HumanFeedbackAnalysis,
  type HumanMorphologyPreferenceSignal,
  type HumanPreferenceDirection,
} from '../feedback/human-feedback-analysis';

export {
  analyzeHumanFeedbackCorpus,
  type HumanFeedbackCorpusAnalysis,
  type HumanFeedbackCorpusEntry,
  type HumanFeedbackCorpusMetricAgreement,
} from '../feedback/human-feedback-corpus';

export {
  EDITORIAL_POLICIES,
  rankByEditorialPolicy,
  type EditorialCriterionEvaluation,
  type EditorialPolicy,
  type EditorialPolicyEvaluation,
  type EditorialPolicyRanking,
  type EditorialPreference,
} from '../editorial/editorial-policy';

export {
  explainEditorialDecision,
  explainParetoRelation,
  type EditorialDecisionExplanation,
  type ParetoDecisionExplanation,
  type QualityMetric,
} from '../explain/decision-explanation';

export {
  WORD_SET_SCHEMA,
  parseWordSetJson,
  serializeWordSet,
  validateWordSet,
  wordSetToEntries,
  type ArtifactProvenance,
  type WordSet,
  type WordSetEntry,
  type WordSetValidationFailure,
  type WordSetValidationIssue,
  type WordSetValidationResult,
  type WordSetValidationSuccess,
} from '../artifacts/word-set';

export {
  CLUE_KINDS,
  CLUE_SET_SCHEMA,
  cluesForAnswer,
  parseClueSetJson,
  serializeClueSet,
  validateClueSet,
  type Clue,
  type ClueKind,
  type ClueSet,
  type ClueSetValidationFailure,
  type ClueSetValidationIssue,
  type ClueSetValidationResult,
  type ClueSetValidationSuccess,
} from '../artifacts/clue-set';

export {
  analyzeWordSet,
  type WordSetAnalysis,
  type WordSetDifficulty,
} from '../artifacts/word-set-analysis';

export {
  WORD_SET_PRESETS,
  findWordSetPreset,
} from '../artifacts/word-set-presets';

export type { Entry } from '../core/domain';
export type { GridQuality } from '../quality/grid-quality';
