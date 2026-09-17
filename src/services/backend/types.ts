import type { RevisionProposal } from '@/services/ai/schemas';
import type {
  ChildrenIntent,
  Claim,
  DatingPreferences,
  DateOutcomeValue,
  Dimension,
  Gender,
  Message,
  ModelRevision,
  Profile,
  ProfilePhoto,
  ProductEventType,
  ReflectionEvent,
  RelationshipGoal,
  SecondDateIntent,
  SensitiveConsent,
  ConsentType,
} from '@/types/domain';
import type {
  ConversationStarterView,
  ConversationView,
  FeatureFlags,
  HomeStateView,
  IntroductionView,
  MicroQuestionView,
  MicroScenarioView,
  ModelInsightView,
  NotebookView,
  PredictionGameView,
  PredictionResultView,
  ReportInput,
  RevisionCardView,
  Session,
  UserDataExport,
  VerificationView,
  WeeklyRecapView,
} from '@/types/views';

export interface ProfileInput {
  displayName: string;
  dateOfBirth: string;
  gender: Gender;
  city: string;
  area: string;
  approxLat: number;
  approxLng: number;
  occupation: string | null;
  showOccupation: boolean;
  bio: string;
}

export interface PreferencesInput {
  preferredGenders: Gender[];
  minAge: number;
  maxAge: number;
  maxDistanceKm: number;
  relationshipGoal: RelationshipGoal;
  smokingDealbreaker: boolean;
  childrenIntent: ChildrenIntent;
  childrenDealbreaker: boolean;
}

/**
 * The single backend contract used by the entire app. It is deliberately
 * coarse-grained: each method is one product operation, so authorization and
 * privacy are enforced in one place (RLS + server functions in production,
 * in-memory checks in the dev implementation). The app never talks to OpenAI,
 * Supabase, or any vendor directly.
 */
export interface Backend {
  readonly kind: 'dev' | 'supabase';

  // --- Auth ---
  sendEmailOtp(email: string): Promise<{ devCode?: string }>;
  verifyEmailOtp(email: string, code: string): Promise<Session>;
  getSession(): Promise<Session | null>;
  signOut(): Promise<void>;

  // --- Profile & onboarding ---
  getProfile(userId: string): Promise<Profile | null>;
  saveProfile(userId: string, input: ProfileInput): Promise<Profile>;
  getPreferences(userId: string): Promise<DatingPreferences | null>;
  savePreferences(userId: string, input: PreferencesInput): Promise<DatingPreferences>;
  recordConsent(userId: string, type: ConsentType, granted: boolean): Promise<void>;
  listConsents(userId: string): Promise<SensitiveConsent[]>;
  saveOnboardingClaims(userId: string, answers: Partial<Record<Dimension, string>>): Promise<void>;
  completeOnboarding(userId: string): Promise<Profile>;

  // --- Photos ---
  listPhotos(userId: string): Promise<ProfilePhoto[]>;
  addPhoto(userId: string, localUri: string): Promise<ProfilePhoto>;
  removePhoto(userId: string, photoId: string): Promise<void>;
  getPhotoUrl(storagePath: string): Promise<string>;

  // --- Verification ---
  getVerification(userId: string): Promise<VerificationView>;
  submitSelfie(userId: string, localUri: string): Promise<VerificationView>;

  // --- Relationship model (claims) ---
  listClaims(userId: string): Promise<Claim[]>;
  getModelInsights(userId: string): Promise<ModelInsightView[]>;
  confirmClaim(userId: string, claimId: string): Promise<Claim>;
  rejectClaim(userId: string, claimId: string): Promise<Claim>;
  editClaim(userId: string, claimId: string, value: string, importance: number): Promise<Claim>;
  forgetClaim(userId: string, claimId: string): Promise<void>;
  listRevisions(userId: string): Promise<ModelRevision[]>;

  // --- Matchmaker interactions ---
  shareThought(userId: string, text: string): Promise<{ createdClaims: Claim[] }>;
  getPendingMicroQuestion(userId: string): Promise<MicroQuestionView | null>;
  answerMicroQuestion(userId: string, dimension: Dimension, value: string): Promise<Claim>;

  // --- Reflections & outcomes ---
  submitReflection(
    userId: string,
    introductionId: string,
    text: string,
  ): Promise<{ reflection: ReflectionEvent; proposals: RevisionProposal[] }>;
  confirmRevision(userId: string, reflectionId: string, proposal: RevisionProposal): Promise<Claim>;
  rejectRevision(userId: string, reflectionId: string, proposal: RevisionProposal): Promise<void>;
  submitDateOutcome(
    userId: string,
    introductionId: string,
    outcome: DateOutcomeValue,
    secondDate: SecondDateIntent,
  ): Promise<void>;

  // --- Introductions ---
  listIntroductions(userId: string): Promise<IntroductionView[]>;
  getIntroduction(userId: string, introductionId: string): Promise<IntroductionView | null>;
  submitDecision(
    userId: string,
    introductionId: string,
    decision: 'interested' | 'not_for_me',
  ): Promise<{ mutual: boolean; conversationId: string | null }>;
  /** Runs the matching pipeline and creates an introduction if a candidate exists. */
  requestIntroduction(userId: string): Promise<IntroductionView | null>;

  // --- Chat ---
  listConversations(userId: string): Promise<ConversationView[]>;
  listMessages(userId: string, conversationId: string): Promise<Message[]>;
  sendMessage(userId: string, conversationId: string, body: string): Promise<Message>;
  markConversationRead(userId: string, conversationId: string): Promise<void>;
  subscribeMessages(conversationId: string, onMessage: (message: Message) => void): () => void;

  // --- Safety ---
  blockUser(userId: string, targetUserId: string): Promise<void>;
  reportUser(userId: string, input: ReportInput): Promise<void>;

  // --- Events & config ---
  track(
    userId: string | null,
    eventType: ProductEventType,
    props?: Record<string, string | number | boolean | null>,
  ): Promise<void>;
  getFeatureFlags(): Promise<FeatureFlags>;

  // --- Engagement v2 ---
  getHomeState(userId: string): Promise<HomeStateView>;
  getNotebook(userId: string): Promise<NotebookView>;
  getLatestRevisionCard(userId: string): Promise<RevisionCardView | null>;
  acknowledgeRevisionCard(
    userId: string,
    revisionId: string,
    response: 'exactly' | 'sort_of' | 'not_really',
  ): Promise<void>;
  getMicroScenario(userId: string): Promise<MicroScenarioView | null>;
  answerMicroScenario(userId: string, scenarioId: string, value: string): Promise<Claim>;
  getPredictionGame(userId: string): Promise<PredictionGameView | null>;
  submitPrediction(
    userId: string,
    predictionId: string,
    choice: 'a' | 'b',
    reason: string | null,
  ): Promise<PredictionResultView>;
  getWeeklyRecap(userId: string): Promise<WeeklyRecapView | null>;
  getConversationStarter(
    userId: string,
    conversationId: string,
  ): Promise<ConversationStarterView | null>;

  // --- Account (GDPR) ---
  exportData(userId: string): Promise<UserDataExport>;
  deleteAccount(userId: string): Promise<void>;
}
