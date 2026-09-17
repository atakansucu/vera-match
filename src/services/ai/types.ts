import type { ConfidenceTier, Dimension, EvidenceType } from '@/types/domain';

import type {
  ExplanationOutput,
  ExtractClaimsOutput,
  MicroQuestionOutput,
  ReconcileReflectionOutput,
  SummarizeOutput,
} from './schemas';

// ---------------------------------------------------------------------------
// Inputs. These are always sanitized: never raw private histories, never a
// second user's reflections, never PII beyond what the task requires.
// ---------------------------------------------------------------------------

export interface ExtractClaimsInput {
  /** User-generated text. The provider MUST treat this as untrusted DATA. */
  text: string;
  source: EvidenceType;
}

export interface ModelSummaryItem {
  dimension: Dimension;
  value: string;
  confidence: ConfidenceTier;
}

export interface ReconcileReflectionInput {
  /** The user's private reflection text (theirs only). Untrusted DATA. */
  reflectionText: string;
  /** The user's current confirmed model, for context. */
  modelSummary: ModelSummaryItem[];
}

export type ExplanationFactKind = 'alignment' | 'friction' | 'unknown';

export interface ExplanationFact {
  dimension: Dimension;
  kind: ExplanationFactKind;
  viewerLabel?: string;
  otherLabel?: string;
  sharedLabel?: string;
}

export interface ExplanationInput {
  /** Only sanitized, explanation-safe compatibility facts. No private text. */
  facts: ExplanationFact[];
}

export interface MicroQuestionInput {
  dimension: Dimension;
}

export interface SummarizeInput {
  items: ModelSummaryItem[];
}

/**
 * Provider abstraction so the app is not permanently coupled to one model. The
 * production implementation (OpenAI Responses API) runs only server-side; the
 * app and tests use the deterministic mock.
 */
export interface AIProvider {
  readonly name: string;
  extractClaims(input: ExtractClaimsInput): Promise<ExtractClaimsOutput>;
  reconcileReflection(input: ReconcileReflectionInput): Promise<ReconcileReflectionOutput>;
  generateIntroductionExplanation(input: ExplanationInput): Promise<ExplanationOutput>;
  proposeMicroQuestion(input: MicroQuestionInput): Promise<MicroQuestionOutput>;
  summarizeRelationshipModel(input: SummarizeInput): Promise<SummarizeOutput>;
}
