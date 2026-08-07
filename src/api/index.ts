export {
  generate,
  type GeneratedGrid,
  type GenerationRequest,
  type GenerationResult,
  type GenerationStrategy,
} from './generate';
export { deriveCrossword, type CrosswordDerivationArtifacts, type DeriveCrosswordRequest, type TraceableCrosswordDerivation } from './derive-crossword';
export { analyzeParetoFront, gridQualitySignature, type ParetoFrontAnalysis, type ParetoQualityFamily } from '../quality/pareto-analysis';
export { gridMorphologySignature, measureGridMorphology, type GridMorphology } from '../quality/grid-morphology';
export { analyzeParetoMorphology, type ParetoMorphologyAnalysis, type ParetoMorphologyFamily } from '../quality/pareto-morphology';
export { analyzeMorphologyObservations, analyzeParetoMorphologyDiscriminants, type MorphologyDiscriminant, type MorphologyDiscriminantAnalysis, type MorphologyMetric, type MorphologyObservation } from '../quality/morphology-discriminants';
export { comparableSolutionId, createHumanComparisonArtifact, createHumanComparisonVote, createSameQualityComparisonPairs, type HumanComparisonArtifact, type HumanComparisonDecision, type HumanComparisonPair, type HumanComparisonVote } from '../feedback/pairwise-comparison';
export { analyzeHumanComparisonArtifact, analyzeHumanComparisonVotes, type HumanFeedbackAnalysis, type HumanMorphologyPreferenceSignal, type HumanPreferenceDirection } from '../feedback/human-feedback-analysis';
export { analyzeHumanFeedbackCorpus, type HumanFeedbackCorpusAnalysis, type HumanFeedbackCorpusEntry, type HumanFeedbackCorpusMetricAgreement } from '../feedback/human-feedback-corpus';
export { EDITORIAL_POLICIES, rankByEditorialPolicy, type EditorialCriterionEvaluation, type EditorialPolicy, type EditorialPolicyEvaluation, type EditorialPolicyRanking, type EditorialPreference } from '../editorial/editorial-policy';
export { explainEditorialDecision, explainParetoRelation, type EditorialDecisionExplanation, type ParetoDecisionExplanation, type QualityMetric } from '../explain/decision-explanation';
export { WORD_SET_SCHEMA, parseWordSetJson, serializeWordSet, validateWordSet, wordSetToEntries, type ArtifactProvenance, type WordSet, type WordSetEntry, type WordSetValidationFailure, type WordSetValidationIssue, type WordSetValidationResult, type WordSetValidationSuccess } from '../artifacts/word-set';
export { EDITORIAL_LOCK_SET_SCHEMA, checkEditorialLocks, serializeEditorialLockSet, type EditorialLockCheck, type EditorialLockConflict, type EditorialLockSet, type PlacementEditorialLock } from '../artifacts/editorial-lock-set';
export { DERIVATION_RECORD_SCHEMA, createDerivationRecord, serializeDerivationRecord, type CreateDerivationRecordOptions, type DerivationDecisionRef, type DerivationGenerationConfig, type DerivationRecord, type DerivationSourceKind, type DerivationSourceRef } from '../artifacts/derivation-record';
export { CLUE_KINDS, CLUE_SET_SCHEMA, cluesForAnswer, parseClueSetJson, serializeClueSet, validateClueSet, type Clue, type ClueKind, type ClueSet, type ClueSetValidationFailure, type ClueSetValidationIssue, type ClueSetValidationResult, type ClueSetValidationSuccess } from '../artifacts/clue-set';
export { analyzeClueCoverage, type ClueCoverage } from '../artifacts/clue-coverage';
export { analyzeGridClueCoverage, type GridClueCoverage } from '../artifacts/grid-clue-coverage';
export { PLAYABLE_CROSSWORD_SCHEMA, composePlayableCrossword, composePlayableCrosswordFromArtifacts, parsePlayableCrosswordJson, serializePlayableCrossword, validatePlayableCrossword, type ClueSelection, type ComposePlayableCrosswordFromArtifactsOptions, type ComposePlayableCrosswordOptions, type ComposePlayableCrosswordResult, type PlayableClue, type PlayableCrossword, type PlayableCrosswordIssue, type PlayableCrosswordValidationResult, type PlayableEntry } from '../artifacts/playable-crossword';
export { classifyPlayableEntries, type ClassifiedPlayableEntry, type PlayableEntryRole, type PlayableEntryRoleSummary } from '../artifacts/playable-entry-role';
export { analyzePlayableClueCoverage, type PlayableClueCoverage } from '../artifacts/playable-clue-coverage';
export { preflightPlayablePublication, type PlayablePublicationIssue, type PlayablePublicationPreflight } from '../artifacts/playable-publication';
export { SOLVE_FEEDBACK_SCHEMA, parseSolveFeedbackJson, serializeSolveFeedback, validateSolveFeedback, type SolveDifficultyRating, type SolveEnjoymentRating, type SolveFeedback, type SolveFeedbackIssue, type SolveFeedbackValidationResult } from '../artifacts/solve-feedback';
export { LEXICON_SCHEMA, lexiconToCandidates, parseLexiconJson, serializeLexicon, validateLexicon, type Lexicon, type LexiconEntry, type LexiconValidationIssue, type LexiconValidationResult } from '../artifacts/lexicon';
export { importLexique4Tsv, type Lexique4ImportIssue, type Lexique4ImportOptions, type Lexique4ImportResult } from '../lexicons/lexique4-adapter';
export { candidatesForSlot, detectFillSlots, fillSeedGrid, type FillPassOptions, type FillPassResult, type FillPassStats, type FillSlot } from '../fill/fill-pass';
export { DEFAULT_LEXICAL_QUALITY_POLICY, normalizeLexicon, scoreLexicalCandidate, type LexicalCandidate, type LexicalQualityPolicy, type ScoredLexicalCandidate } from '../fill/lexical-quality';
export { analyzeWordSet, type SearchComplexity, type WordSetAnalysis, type WordSetDifficulty } from '../artifacts/word-set-analysis';
export { WORD_SET_PRESETS, findWordSetPreset } from '../artifacts/word-set-presets';
export { CLUE_SET_PRESETS, findClueSetPreset } from '../artifacts/clue-set-presets';
export type { Entry, Placement } from '../core/domain';
export type { GridQuality } from '../quality/grid-quality';
