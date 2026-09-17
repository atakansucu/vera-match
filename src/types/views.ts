import type {
  Decision,
  Dimension,
  ExplanationPoint,
  IntroductionStatus,
  ReportCategory,
  VerificationStatus,
} from './domain';

export interface Session {
  userId: string;
  email: string;
}

/**
 * The ONLY projection of another user that a peer may see. Derived server-side
 * from the profile, exposing reveal-safe fields only: no DOB (age instead), no
 * exact coordinates, no private claims/reflections.
 */
export interface RevealProfile {
  userId: string;
  firstName: string;
  age: number;
  city: string;
  area: string;
  occupation: string | null;
  bio: string;
  verified: boolean;
  photos: { id: string; url: string }[];
}

export interface IntroductionExplanationView {
  alignment: ExplanationPoint[];
  friction: ExplanationPoint[];
  unknowns: ExplanationPoint[];
  generatedBy: 'llm' | 'fallback';
}

export interface IntroductionView {
  id: string;
  status: IntroductionStatus;
  createdAt: string;
  other: RevealProfile;
  explanation: IntroductionExplanationView;
  myDecision: Decision | null;
  mutual: boolean;
  conversationId: string | null;
}

export interface ConversationView {
  id: string;
  introductionId: string;
  other: { userId: string; firstName: string; photoUrl: string | null };
  lastMessage: { body: string; createdAt: string; senderId: string } | null;
  unreadCount: number;
}

/** A single item on the "What my matchmaker knows" screen. */
export interface ModelInsightView {
  claimId: string;
  dimension: Dimension;
  group: string;
  label: string;
  valueLabel: string;
  /** Raw scale value + importance, used by the inline editor. */
  value: string;
  importance: number;
  /** Language-based confidence, never a percentage. */
  confidenceText: string;
  sourceText: string;
  status: 'unconfirmed' | 'confirmed';
}

export interface MicroQuestionView {
  dimension: Dimension;
  question: string;
  options: { label: string; value: string }[];
}

export interface FeatureFlags {
  weeklyIntroductionLimit: number;
  microQuestionEnabled: boolean;
  postDateReflectionEnabled: boolean;
  frictionVisible: boolean;
  demoMode: boolean;
  betaAllowedEmailDomains: string[];
  // Engagement v2
  matchDropEnabled: boolean;
  microScenariosEnabled: boolean;
  predictionGameEnabled: boolean;
  weeklyRecapEnabled: boolean;
  conversationStarterEnabled: boolean;
}

export interface ReportInput {
  reportedUserId: string;
  category: ReportCategory;
  contextType: 'profile' | 'message' | 'introduction';
  contextId: string | null;
  note: string;
}

export interface VerificationView {
  status: VerificationStatus;
  /** True when the current backend uses the non-production selfie stub. */
  usingStub: boolean;
}

export interface UserDataExport {
  exportedAt: string;
  profile: unknown;
  preferences: unknown;
  consents: unknown;
  claims: unknown;
  reflections: unknown;
  introductions: unknown;
  messages: unknown;
  photos: unknown;
  dateOutcomes: unknown;
}

// ---------------------------------------------------------------------------
// Engagement v2 views
// ---------------------------------------------------------------------------

/** Matchmaker notebook: insights grouped by confidence posture. */
export interface NotebookView {
  prettySure: ModelInsightView[];
  reconsidering: ModelInsightView[];
  figuringOut: ModelInsightView[];
}

/** "I changed my mind about something" card. */
export interface RevisionCardView {
  revisionId: string;
  dimension: Dimension;
  label: string;
  previousValueLabel: string;
  newValueLabel: string;
  narrative: string;
}

/** Weekly matchmaker recap. */
export interface WeeklyRecapView {
  learned: string | null;
  stoppedAssuming: string | null;
  stillCurious: string | null;
  promisingCandidate: boolean;
}

/** Micro-scenario question (richer than MicroQuestionView). */
export interface MicroScenarioView {
  id: string;
  targetDimension: Dimension;
  prompt: string;
  options: { label: string; value: string }[];
  reason: string;
}

/** "Would I get you right?" prediction game. */
export interface PredictionGameView {
  id: string;
  candidateA: { label: string; traits: string[] };
  candidateB: { label: string; traits: string[] };
}

/** Prediction game result after user answers. */
export interface PredictionResultView {
  correct: boolean;
  matchmakerPredicted: 'a' | 'b';
  userChose: 'a' | 'b';
}

/** Grounded conversation starter after mutual interest. */
export interface ConversationStarterView {
  text: string;
  dimension: Dimension;
}

/** Current home screen state — what the matchmaker has for the user. */
export interface HomeStateView {
  matchDrop: IntroductionView | null;
  revisionCard: RevisionCardView | null;
  microScenario: MicroScenarioView | null;
  weeklyRecap: WeeklyRecapView | null;
  hasPredictionGame: boolean;
}
