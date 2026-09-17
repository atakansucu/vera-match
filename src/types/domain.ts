/**
 * Core domain model for Kindred.
 *
 * These types are the single source of truth shared by the UI, the backend
 * service layer, the matching engine and the AI schemas. Enums are expressed as
 * string-literal unions plus a runtime `const` array so we can both type-check
 * and validate at runtime.
 */

export type UserId = string;
export type ClaimId = string;
export type IntroductionId = string;
export type ConversationId = string;

// ---------------------------------------------------------------------------
// Identity & preferences
// ---------------------------------------------------------------------------

export const GENDERS = ['woman', 'man', 'nonbinary'] as const;
export type Gender = (typeof GENDERS)[number];

export const RELATIONSHIP_GOALS = ['life_partner', 'long_term', 'short_term', 'unsure'] as const;
export type RelationshipGoal = (typeof RELATIONSHIP_GOALS)[number];

export const VERIFICATION_STATUSES = [
  'unverified',
  'email_verified',
  'selfie_pending',
  'selfie_verified',
  'rejected',
] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export const MODERATION_STATUSES = ['active', 'flagged', 'suspended', 'banned'] as const;
export type ModerationStatus = (typeof MODERATION_STATUSES)[number];

export const SMOKING_HABITS = ['no', 'sometimes', 'yes'] as const;
export type SmokingHabit = (typeof SMOKING_HABITS)[number];

export const CHILDREN_INTENTS = ['want', 'dont_want', 'open', 'unsure'] as const;
export type ChildrenIntent = (typeof CHILDREN_INTENTS)[number];

export interface Profile {
  id: UserId;
  displayName: string;
  /** Private. Never exposed to other users; only `age` is derived for display. */
  dateOfBirth: string; // ISO date (yyyy-mm-dd)
  gender: Gender;
  city: string;
  /** Broad neighbourhood label, e.g. "Maxvorstadt". Never exact address. */
  area: string;
  /** Coarse coordinates (rounded) used only server-side for distance. Never sent to peers. */
  approxLat: number;
  approxLng: number;
  occupation: string | null;
  showOccupation: boolean;
  /** Short self-written text. Treated as untrusted DATA by the AI layer. */
  bio: string;
  moderationStatus: ModerationStatus;
  verificationStatus: VerificationStatus;
  onboardingCompletedAt: string | null;
  createdAt: string;
}

export interface DatingPreferences {
  userId: UserId;
  preferredGenders: Gender[];
  minAge: number;
  maxAge: number;
  maxDistanceKm: number;
  relationshipGoal: RelationshipGoal;
  /** Hard dealbreaker: if true, exclude anyone who smokes ("yes"). */
  smokingDealbreaker: boolean;
  childrenIntent: ChildrenIntent;
  /** Hard dealbreaker: if true, require compatible children intent. */
  childrenDealbreaker: boolean;
}

export interface ProfilePhoto {
  id: string;
  userId: UserId;
  storagePath: string;
  position: number;
  isPrimary: boolean;
  moderationStatus: ModerationStatus;
}

export const CONSENT_TYPES = [
  'partner_gender_matching',
  'photo_processing',
  'ai_processing',
] as const;
export type ConsentType = (typeof CONSENT_TYPES)[number];

export interface SensitiveConsent {
  userId: UserId;
  consentType: ConsentType;
  granted: boolean;
  grantedAt: string | null;
  withdrawnAt: string | null;
  version: string;
}

// ---------------------------------------------------------------------------
// Relationship model: claims + evidence
// ---------------------------------------------------------------------------

export const CLAIM_TYPES = ['stated', 'observed', 'hypothesis'] as const;
export type ClaimType = (typeof CLAIM_TYPES)[number];

export const CLAIM_STATUSES = ['unconfirmed', 'confirmed', 'rejected', 'superseded'] as const;
export type ClaimStatus = (typeof CLAIM_STATUSES)[number];

/**
 * Confidence is a discrete, deterministically-derived tier (never an LLM-invented
 * float). The UI communicates it with language, not fake precision.
 */
export const CONFIDENCE_TIERS = [
  'explicit_high',
  'confirmed_medium_high',
  'weak_low',
  'unknown',
] as const;
export type ConfidenceTier = (typeof CONFIDENCE_TIERS)[number];

export const EVIDENCE_TYPES = [
  'onboarding_answer',
  'micro_question_answer',
  'reflection',
  'decision_behavior',
  'profile_text',
  'direct_edit',
] as const;
export type EvidenceType = (typeof EVIDENCE_TYPES)[number];

export const RELIABILITIES = ['high', 'medium', 'low'] as const;
export type Reliability = (typeof RELIABILITIES)[number];

export interface Claim {
  id: ClaimId;
  userId: UserId;
  dimension: Dimension;
  value: string;
  claimType: ClaimType;
  confidence: ConfidenceTier;
  /** 1 (minor) .. 5 (dealbreaker-adjacent). */
  importance: number;
  status: ClaimStatus;
  sourceType: EvidenceType;
  supersededBy: ClaimId | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClaimEvidence {
  id: string;
  claimId: ClaimId;
  eventType: string;
  eventId: string | null;
  evidenceType: EvidenceType;
  reliability: Reliability;
  createdAt: string;
}

export interface ModelRevision {
  id: string;
  userId: UserId;
  claimId: ClaimId | null;
  dimension: Dimension;
  previousValue: string | null;
  newValue: string | null;
  source: EvidenceType;
  confirmed: boolean;
  reflectionEventId: string | null;
  createdAt: string;
}

export interface ReflectionEvent {
  id: string;
  userId: UserId;
  introductionId: IntroductionId | null;
  /** PRIVATE raw text. Never exposed to peers, never used verbatim in explanations. */
  rawText: string;
  aiProcessed: boolean;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Focused preference ontology (dimensions)
// ---------------------------------------------------------------------------

export const DIMENSIONS = [
  // intentions
  'exclusivity_expectation',
  'long_term_orientation',
  // lifestyle
  'activity_level',
  'social_frequency',
  'travel_tendency',
  'planning_style',
  'alcohol',
  // communication
  'texting_frequency',
  'communication_directness',
  'emotional_openness',
  'need_for_alone_time',
  // dynamics
  'independence',
  'work_life_balance',
  'conflict_style',
  'ambition',
] as const;
export type Dimension = (typeof DIMENSIONS)[number];

// ---------------------------------------------------------------------------
// Introductions, decisions, matches
// ---------------------------------------------------------------------------

export const INTRODUCTION_STATUSES = ['active', 'matched', 'closed', 'expired'] as const;
export type IntroductionStatus = (typeof INTRODUCTION_STATUSES)[number];

export const DECISIONS = ['interested', 'not_for_me'] as const;
export type Decision = (typeof DECISIONS)[number];

export interface Introduction {
  id: IntroductionId;
  userA: UserId;
  userB: UserId;
  status: IntroductionStatus;
  /** Set when an operator creates the intro manually (concierge matching). */
  createdBy: UserId | null;
  /** INTERNAL deterministic score. Never exposed to clients. */
  rankScore: number;
  algoVersion: string;
  createdAt: string;
  expiresAt: string | null;
}

/** An explanation is generated per-recipient (phrasing differs per side). */
export interface IntroductionExplanation {
  id: string;
  introductionId: IntroductionId;
  forUser: UserId;
  alignment: ExplanationPoint[];
  friction: ExplanationPoint[];
  unknowns: ExplanationPoint[];
  /** 'llm' or 'fallback' — provenance for the natural-language rendering. */
  generatedBy: 'llm' | 'fallback';
  createdAt: string;
}

export interface ExplanationPoint {
  /** Human-readable sentence. Must trace back to `dimension`. */
  text: string;
  dimension: Dimension | null;
}

export interface IntroductionDecision {
  introductionId: IntroductionId;
  userId: UserId;
  decision: Decision;
  decidedAt: string;
}

export interface Match {
  id: string;
  introductionId: IntroductionId;
  userA: UserId;
  userB: UserId;
  createdAt: string;
  closedAt: string | null;
}

// ---------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------

export interface Conversation {
  id: ConversationId;
  matchId: string;
  createdAt: string;
  lastMessageAt: string | null;
}

export interface Message {
  id: string;
  conversationId: ConversationId;
  senderId: UserId;
  body: string;
  createdAt: string;
  readAt: string | null;
}

// ---------------------------------------------------------------------------
// Safety
// ---------------------------------------------------------------------------

export const REPORT_CATEGORIES = [
  'harassment',
  'hate_abuse',
  'fake_identity',
  'scam',
  'inappropriate_sexual',
  'threat_safety',
  'underage',
  'other',
] as const;
export type ReportCategory = (typeof REPORT_CATEGORIES)[number];

export const REPORT_STATUSES = ['open', 'reviewing', 'actioned', 'dismissed'] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export interface Report {
  id: string;
  reporterId: UserId;
  reportedUserId: UserId;
  category: ReportCategory;
  contextType: 'profile' | 'message' | 'introduction';
  contextId: string | null;
  note: string;
  status: ReportStatus;
  createdAt: string;
}

export interface Block {
  blockerId: UserId;
  blockedId: UserId;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Outcomes
// ---------------------------------------------------------------------------

export const DATE_OUTCOMES = ['met', 'did_not_meet', 'prefer_not_say'] as const;
export type DateOutcomeValue = (typeof DATE_OUTCOMES)[number];

export const SECOND_DATE_INTENTS = ['want_again', 'no_continue', 'prefer_not_say'] as const;
export type SecondDateIntent = (typeof SECOND_DATE_INTENTS)[number];

export interface DateOutcome {
  id: string;
  introductionId: IntroductionId;
  userId: UserId;
  outcome: DateOutcomeValue;
  secondDateIntent: SecondDateIntent;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Product analytics + AI usage
// ---------------------------------------------------------------------------

export const PRODUCT_EVENTS = [
  'onboarding_started',
  'onboarding_completed',
  'introduction_viewed',
  'introduction_profile_opened',
  'introduction_interested',
  'introduction_rejected',
  'mutual_interest',
  'chat_started',
  'date_reported',
  'reflection_submitted',
  'model_revision_confirmed',
  'model_revision_rejected',
  // Engagement v2
  'match_drop_opened',
  'match_reason_viewed',
  'match_profile_viewed',
  'matchmaker_insight_viewed',
  'matchmaker_insight_confirmed',
  'matchmaker_insight_partially_confirmed',
  'matchmaker_insight_rejected',
  'micro_scenario_viewed',
  'micro_scenario_answered',
  'micro_scenario_skipped',
  'prediction_game_started',
  'prediction_game_answered',
  'prediction_correct',
  'prediction_incorrect',
  'weekly_recap_viewed',
  'conversation_starter_viewed',
  'conversation_starter_used',
  'conversation_starter_skipped',
] as const;
export type ProductEventType = (typeof PRODUCT_EVENTS)[number];

export interface ProductEvent {
  id: string;
  userId: UserId | null;
  eventType: ProductEventType;
  props: Record<string, string | number | boolean | null>;
  createdAt: string;
}

export const AI_TASK_TYPES = [
  'extract_claims',
  'reconcile_reflection',
  'generate_explanation',
  'propose_micro_question',
  'summarize_model',
  'analyze_conversation',
] as const;
export type AiTaskType = (typeof AI_TASK_TYPES)[number];

export interface AiUsageRecord {
  id: string;
  userId: UserId | null;
  taskType: AiTaskType;
  model: string;
  latencyMs: number;
  inputTokens: number | null;
  outputTokens: number | null;
  success: boolean;
  errorCode: string | null;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Engagement v2: micro-scenarios, prediction game
// ---------------------------------------------------------------------------

export const SCENARIO_STATUSES = ['pending', 'answered', 'skipped', 'expired'] as const;
export type ScenarioStatus = (typeof SCENARIO_STATUSES)[number];

export interface MicroScenario {
  id: string;
  userId: UserId;
  targetDimension: Dimension;
  scenarioType: string;
  prompt: string;
  options: { label: string; value: string }[];
  reason: string;
  candidateId: UserId | null;
  status: ScenarioStatus;
  createdAt: string;
  answeredAt: string | null;
}

export interface PredictionEvent {
  id: string;
  userId: UserId;
  predictionType: 'candidate_preference';
  candidateAPayload: { label: string; traits: string[] };
  candidateBPayload: { label: string; traits: string[] };
  predictedChoice: 'a' | 'b';
  actualChoice: 'a' | 'b' | null;
  correct: boolean | null;
  modelVersion: string;
  reason: string | null;
  createdAt: string;
}
