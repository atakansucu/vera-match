import { z } from 'zod';

import { CLAIM_TYPES, DIMENSIONS } from '@/types/domain';

/**
 * Zod schemas for every AI task output. These double as the JSON Schema contract
 * for OpenAI Structured Outputs and as the runtime validator that rejects
 * malformed or hallucinated model output. `strictObject` rejects unknown keys so
 * the model cannot smuggle in extra fields.
 */

const dimensionEnum = z.enum(DIMENSIONS);
const claimTypeEnum = z.enum(CLAIM_TYPES);

export const proposedClaimSchema = z.strictObject({
  dimension: dimensionEnum,
  value: z.string().min(1).max(60),
  claimType: claimTypeEnum,
  rationale: z.string().min(1).max(300),
});
export type ProposedClaim = z.infer<typeof proposedClaimSchema>;

export const extractClaimsOutputSchema = z.strictObject({
  claims: z.array(proposedClaimSchema).max(5),
});
export type ExtractClaimsOutput = z.infer<typeof extractClaimsOutputSchema>;

export const revisionProposalSchema = z.strictObject({
  dimension: dimensionEnum,
  value: z.string().min(1).max(60),
  previousValue: z.string().max(60).nullable(),
  /** Neutral explanation of the hypothesis. Never therapy language. */
  rationale: z.string().min(1).max(300),
  /** The "Does this sound right?" confirmation question shown to the user. */
  question: z.string().min(1).max(200),
});
export type RevisionProposal = z.infer<typeof revisionProposalSchema>;

export const reconcileReflectionOutputSchema = z.strictObject({
  proposals: z.array(revisionProposalSchema).max(3),
});
export type ReconcileReflectionOutput = z.infer<typeof reconcileReflectionOutputSchema>;

export const explanationOutputSchema = z.strictObject({
  alignment: z.array(z.string().min(1).max(220)).max(3),
  friction: z.array(z.string().min(1).max(220)).max(2),
  unknowns: z.array(z.string().min(1).max(220)).max(2),
});
export type ExplanationOutput = z.infer<typeof explanationOutputSchema>;

export const microQuestionOptionSchema = z.strictObject({
  label: z.string().min(1).max(60),
  value: z.string().min(1).max(60),
});

export const microQuestionOutputSchema = z.strictObject({
  question: z.string().min(1).max(200),
  options: z.array(microQuestionOptionSchema).min(2).max(4),
});
export type MicroQuestionOutput = z.infer<typeof microQuestionOutputSchema>;

export const summarizeOutputSchema = z.strictObject({
  summary: z.string().min(1).max(600),
});
export type SummarizeOutput = z.infer<typeof summarizeOutputSchema>;

/**
 * Output from deep conversation analysis. Each insight maps to one of the 15
 * dimensions and starts life as an `unconfirmed` claim — the user must confirm
 * before it influences matching.
 */
export const conversationInsightSchema = z.strictObject({
  dimension: dimensionEnum,
  value: z.string().min(1).max(60),
  claimType: claimTypeEnum,
  rationale: z.string().min(1).max(300),
  /** Confidence signal the AI observed — "strong" if user stated it directly, "weak" if inferred. */
  signal: z.enum(['strong', 'weak']),
  /** The exact quote or paraphrase from the transcript that supports this insight. */
  evidence: z.string().min(1).max(200),
});
export type ConversationInsight = z.infer<typeof conversationInsightSchema>;

export const analyzeConversationOutputSchema = z.strictObject({
  insights: z.array(conversationInsightSchema).max(10),
  /** Brief matchmaker-style summary of what was learned (1-2 sentences). */
  summary: z.string().min(1).max(400),
});
export type AnalyzeConversationOutput = z.infer<typeof analyzeConversationOutputSchema>;
