import { MockAIProvider } from '@/services/ai/mockProvider';
import type { RevisionProposal } from '@/services/ai/schemas';
import type { AIProvider, ExplanationFact, ModelSummaryItem } from '@/services/ai/types';
import { claimsToInsights } from '@/features/claims/insights';
import { confirmedDimensions } from '@/features/claims/matching';
import { deriveConfidence } from '@/features/claims/confidence';
import { DIMENSION_SPECS } from '@/features/matching/dimensions';
import {
  buildFallbackExplanation,
  computeCompatibility,
  rankCandidates,
  selectMicroQuestionNeed,
  type EligibilityContext,
  type MatchingProfile,
} from '@/features/matching';
import { ageFromDob } from '@/lib/date';
import { DEFAULT_FEATURE_FLAGS } from '@/lib/featureFlags';
import { logDev } from '@/lib/log';
import type {
  AiTaskType,
  Claim,
  DateOutcomeValue,
  Dimension,
  ExplanationPoint,
  Message,
  ModelRevision,
  Profile,
  ProfilePhoto,
  ProductEventType,
  ReflectionEvent,
  SecondDateIntent,
  SensitiveConsent,
  ConsentType,
  DatingPreferences,
} from '@/types/domain';
import type {
  ConversationStarterView,
  ConversationView,
  FeatureFlags,
  HomeStateView,
  IntroductionExplanationView,
  IntroductionView,
  MicroQuestionView,
  MicroScenarioView,
  ModelInsightView,
  NotebookView,
  PredictionGameView,
  PredictionResultView,
  ReportInput,
  RevealProfile,
  RevisionCardView,
  Session,
  UserDataExport,
  VerificationView,
  WeeklyRecapView,
} from '@/types/views';

import { buildConversationStarter } from '@/features/matchmaker/conversationStarter';
import { buildNotebook } from '@/features/matchmaker/notebook';
import {
  buildPredictionPair,
  createPredictionEvent,
  predictionToView,
  resolvePrediction,
} from '@/features/matchmaker/prediction';
import { buildWeeklyRecap } from '@/features/matchmaker/recap';
import { buildRevisionCard } from '@/features/matchmaker/revisionCard';
import { selectScenario, scenarioToMicroScenario } from '@/features/matchmaker/scenarios';

import { createSeedState, type DevState } from './seed';
import type { Backend, PreferencesInput, ProfileInput } from './types';

let counter = 0;
function uid(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}
function nowIso(): string {
  return new Date().toISOString();
}

type MessageSubscriber = (message: Message) => void;

/**
 * In-memory backend used for local development, the web preview and tests. It
 * implements the full product loop (matching, mutual detection, AI orchestration
 * with confirmation gating) so the app is meaningfully testable without a live
 * Supabase project or OpenAI key. Privacy rules are enforced the same way the
 * production backend must: peers only ever receive `RevealProfile` projections,
 * and only CONFIRMED claims influence matching.
 */
export class DevBackend implements Backend {
  readonly kind = 'dev' as const;
  private state: DevState;
  private readonly ai: AIProvider;
  private readonly subscribers = new Map<string, Set<MessageSubscriber>>();

  constructor(ai: AIProvider = new MockAIProvider()) {
    this.state = createSeedState();
    this.ai = ai;
  }

  // -------------------------------------------------------------------------
  // Auth
  // -------------------------------------------------------------------------

  async sendEmailOtp(email: string): Promise<{ devCode?: string }> {
    const code = '000000';
    this.state.pendingOtp.set(email.toLowerCase(), code);
    return { devCode: code };
  }

  async verifyEmailOtp(email: string, code: string): Promise<Session> {
    const key = email.toLowerCase();
    const expected = this.state.pendingOtp.get(key);
    if (expected && code !== expected && code !== '000000') {
      throw new Error('That code is not correct.');
    }
    let session = this.state.usersByEmail.get(key);
    if (!session) {
      const userId = uid('user');
      session = { userId, email };
      this.state.usersByEmail.set(key, session);
    }
    this.state.pendingOtp.delete(key);
    this.state.session = session;
    return session;
  }

  async getSession(): Promise<Session | null> {
    return this.state.session;
  }

  async signOut(): Promise<void> {
    this.state.session = null;
  }

  // -------------------------------------------------------------------------
  // Profile & onboarding
  // -------------------------------------------------------------------------

  async getProfile(userId: string): Promise<Profile | null> {
    return this.state.profiles.get(userId) ?? null;
  }

  async saveProfile(userId: string, input: ProfileInput): Promise<Profile> {
    const existing = this.state.profiles.get(userId);
    const profile: Profile = {
      id: userId,
      displayName: input.displayName,
      dateOfBirth: input.dateOfBirth,
      gender: input.gender,
      city: input.city,
      area: input.area,
      approxLat: input.approxLat,
      approxLng: input.approxLng,
      occupation: input.occupation,
      showOccupation: input.showOccupation,
      bio: input.bio,
      moderationStatus: existing?.moderationStatus ?? 'active',
      verificationStatus: existing?.verificationStatus ?? 'unverified',
      onboardingCompletedAt: existing?.onboardingCompletedAt ?? null,
      createdAt: existing?.createdAt ?? nowIso(),
    };
    this.state.profiles.set(userId, profile);
    return profile;
  }

  async getPreferences(userId: string): Promise<DatingPreferences | null> {
    return this.state.preferences.get(userId) ?? null;
  }

  async savePreferences(userId: string, input: PreferencesInput): Promise<DatingPreferences> {
    const prefs: DatingPreferences = { userId, ...input };
    this.state.preferences.set(userId, prefs);
    return prefs;
  }

  async recordConsent(userId: string, type: ConsentType, granted: boolean): Promise<void> {
    const existing = this.state.consents.find((c) => c.userId === userId && c.consentType === type);
    if (existing) {
      existing.granted = granted;
      existing.grantedAt = granted ? nowIso() : existing.grantedAt;
      existing.withdrawnAt = granted ? null : nowIso();
    } else {
      this.state.consents.push({
        userId,
        consentType: type,
        granted,
        grantedAt: granted ? nowIso() : null,
        withdrawnAt: granted ? null : nowIso(),
        version: '1.0',
      });
    }
  }

  async listConsents(userId: string): Promise<SensitiveConsent[]> {
    return this.state.consents.filter((c) => c.userId === userId);
  }

  async saveOnboardingClaims(
    userId: string,
    answers: Partial<Record<Dimension, string>>,
  ): Promise<void> {
    for (const [dimension, value] of Object.entries(answers)) {
      if (!value) continue;
      this.upsertConfirmedClaim(
        userId,
        dimension as Dimension,
        value,
        'onboarding_answer',
        'stated',
      );
    }
  }

  async completeOnboarding(userId: string): Promise<Profile> {
    const profile = this.requireProfile(userId);
    profile.onboardingCompletedAt = nowIso();
    if (profile.verificationStatus === 'unverified') {
      profile.verificationStatus = 'email_verified';
    }
    await this.track(userId, 'onboarding_completed');
    return profile;
  }

  // -------------------------------------------------------------------------
  // Photos
  // -------------------------------------------------------------------------

  async listPhotos(userId: string): Promise<ProfilePhoto[]> {
    return this.state.photos
      .filter((p) => p.userId === userId)
      .sort((a, b) => a.position - b.position);
  }

  async addPhoto(userId: string, localUri: string): Promise<ProfilePhoto> {
    const existing = await this.listPhotos(userId);
    const photo: ProfilePhoto = {
      id: uid('photo'),
      userId,
      storagePath: localUri,
      position: existing.length,
      isPrimary: existing.length === 0,
      moderationStatus: 'active',
    };
    this.state.photos.push(photo);
    return photo;
  }

  async removePhoto(userId: string, photoId: string): Promise<void> {
    this.state.photos = this.state.photos.filter((p) => !(p.id === photoId && p.userId === userId));
  }

  async getPhotoUrl(storagePath: string): Promise<string> {
    // Dev: storagePath is already a URL or local file uri. Production issues a
    // short-lived signed URL from a private bucket instead.
    return storagePath;
  }

  // -------------------------------------------------------------------------
  // Verification (stub liveness — NOT production ready)
  // -------------------------------------------------------------------------

  async getVerification(userId: string): Promise<VerificationView> {
    const profile = this.requireProfile(userId);
    return { status: profile.verificationStatus, usingStub: true };
  }

  async submitSelfie(userId: string): Promise<VerificationView> {
    const profile = this.requireProfile(userId);
    profile.verificationStatus = 'selfie_pending';
    return { status: profile.verificationStatus, usingStub: true };
  }

  // -------------------------------------------------------------------------
  // Relationship model (claims)
  // -------------------------------------------------------------------------

  async listClaims(userId: string): Promise<Claim[]> {
    return this.state.claims.filter((c) => c.userId === userId);
  }

  async getModelInsights(userId: string): Promise<ModelInsightView[]> {
    const claims = await this.listClaims(userId);
    return claimsToInsights(claims);
  }

  async confirmClaim(userId: string, claimId: string): Promise<Claim> {
    const claim = this.requireClaim(userId, claimId);
    claim.status = 'confirmed';
    claim.confidence = deriveConfidence(claim);
    claim.updatedAt = nowIso();
    await this.track(userId, 'model_revision_confirmed', { dimension: claim.dimension });
    return claim;
  }

  async rejectClaim(userId: string, claimId: string): Promise<Claim> {
    const claim = this.requireClaim(userId, claimId);
    claim.status = 'rejected';
    claim.confidence = 'unknown';
    claim.updatedAt = nowIso();
    await this.track(userId, 'model_revision_rejected', { dimension: claim.dimension });
    return claim;
  }

  async editClaim(
    userId: string,
    claimId: string,
    value: string,
    importance: number,
  ): Promise<Claim> {
    const claim = this.requireClaim(userId, claimId);
    const previous = claim.value;
    claim.value = value;
    claim.importance = importance;
    claim.claimType = 'stated';
    claim.sourceType = 'direct_edit';
    claim.status = 'confirmed';
    claim.confidence = deriveConfidence(claim);
    claim.updatedAt = nowIso();
    this.recordRevision(userId, claim.id, claim.dimension, previous, value, 'direct_edit', true);
    return claim;
  }

  async forgetClaim(userId: string, claimId: string): Promise<void> {
    const claim = this.requireClaim(userId, claimId);
    this.recordRevision(userId, claim.id, claim.dimension, claim.value, null, 'direct_edit', true);
    this.state.claims = this.state.claims.filter((c) => c.id !== claimId);
  }

  async listRevisions(userId: string): Promise<ModelRevision[]> {
    return this.state.revisions.filter((r) => r.userId === userId);
  }

  // -------------------------------------------------------------------------
  // Matchmaker interactions
  // -------------------------------------------------------------------------

  async shareThought(userId: string, text: string): Promise<{ createdClaims: Claim[] }> {
    const output = await this.runAi('extract_claims', () =>
      this.ai.extractClaims({ text, source: 'reflection' }),
    );
    if (!output) return { createdClaims: [] };

    const createdClaims: Claim[] = [];
    for (const proposal of output.claims) {
      const spec = DIMENSION_SPECS[proposal.dimension];
      // Update an existing unconfirmed hypothesis for the dimension rather than duplicating.
      const existing = this.state.claims.find(
        (c) =>
          c.userId === userId && c.dimension === proposal.dimension && c.status === 'unconfirmed',
      );
      if (existing) {
        existing.value = proposal.value;
        existing.updatedAt = nowIso();
        createdClaims.push(existing);
        continue;
      }
      const claim: Claim = {
        id: uid('claim'),
        userId,
        dimension: proposal.dimension,
        value: proposal.value,
        claimType: proposal.claimType,
        confidence: 'weak_low',
        importance: spec.defaultImportance,
        status: 'unconfirmed',
        sourceType: 'reflection',
        supersededBy: null,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      this.state.claims.push(claim);
      createdClaims.push(claim);
    }
    return { createdClaims };
  }

  async getPendingMicroQuestion(userId: string): Promise<MicroQuestionView | null> {
    if (!DEFAULT_FEATURE_FLAGS.microQuestionEnabled) return null;
    const intro = this.state.introductions.find(
      (i) =>
        i.status === 'active' &&
        (i.userA === userId || i.userB === userId) &&
        !this.state.decisions.some((d) => d.introductionId === i.id && d.userId === userId),
    );
    if (!intro) return null;
    const otherId = intro.userA === userId ? intro.userB : intro.userA;
    const viewer = this.toMatchingProfile(userId);
    const other = this.toMatchingProfile(otherId);
    if (!viewer || !other) return null;
    const need = selectMicroQuestionNeed(viewer, other);
    if (!need) return null;
    const output = await this.runAi('propose_micro_question', () =>
      this.ai.proposeMicroQuestion({ dimension: need.dimension }),
    );
    if (!output) return null;
    return { dimension: need.dimension, question: output.question, options: output.options };
  }

  async answerMicroQuestion(userId: string, dimension: Dimension, value: string): Promise<Claim> {
    return this.upsertConfirmedClaim(userId, dimension, value, 'micro_question_answer', 'stated');
  }

  // -------------------------------------------------------------------------
  // Reflections & outcomes
  // -------------------------------------------------------------------------

  async submitReflection(
    userId: string,
    introductionId: string,
    text: string,
  ): Promise<{ reflection: ReflectionEvent; proposals: RevisionProposal[] }> {
    // Store the reflection FIRST so it is never lost, even if AI fails.
    const reflection: ReflectionEvent = {
      id: uid('refl'),
      userId,
      introductionId,
      rawText: text,
      aiProcessed: false,
      createdAt: nowIso(),
    };
    this.state.reflections.push(reflection);
    await this.track(userId, 'reflection_submitted', { introductionId });

    const modelSummary = this.modelSummary(userId);
    const output = await this.runAi('reconcile_reflection', () =>
      this.ai.reconcileReflection({ reflectionText: text, modelSummary }),
    );
    reflection.aiProcessed = output !== null;
    return { reflection, proposals: output?.proposals ?? [] };
  }

  async confirmRevision(
    userId: string,
    reflectionId: string,
    proposal: RevisionProposal,
  ): Promise<Claim> {
    const claim = this.upsertConfirmedClaim(
      userId,
      proposal.dimension,
      proposal.value,
      'reflection',
      'hypothesis',
    );
    this.recordRevision(
      userId,
      claim.id,
      proposal.dimension,
      proposal.previousValue,
      proposal.value,
      'reflection',
      true,
      reflectionId,
    );
    await this.track(userId, 'model_revision_confirmed', { dimension: proposal.dimension });
    return claim;
  }

  async rejectRevision(
    userId: string,
    reflectionId: string,
    proposal: RevisionProposal,
  ): Promise<void> {
    this.recordRevision(
      userId,
      null,
      proposal.dimension,
      proposal.previousValue,
      proposal.value,
      'reflection',
      false,
      reflectionId,
    );
    await this.track(userId, 'model_revision_rejected', { dimension: proposal.dimension });
  }

  async submitDateOutcome(
    userId: string,
    introductionId: string,
    outcome: DateOutcomeValue,
    secondDate: SecondDateIntent,
  ): Promise<void> {
    const existing = this.state.dateOutcomes.find(
      (row) => row.introductionId === introductionId && row.userId === userId,
    );
    if (existing) {
      existing.outcome = outcome;
      existing.secondDateIntent = secondDate;
    } else {
      this.state.dateOutcomes.push({
        id: uid('outcome'),
        introductionId,
        userId,
        outcome,
        secondDateIntent: secondDate,
        createdAt: nowIso(),
      });
    }
    await this.track(userId, 'date_reported', { introductionId, outcome });
  }

  // -------------------------------------------------------------------------
  // Introductions
  // -------------------------------------------------------------------------

  async listIntroductions(userId: string): Promise<IntroductionView[]> {
    const intros = this.state.introductions.filter(
      (i) => (i.userA === userId || i.userB === userId) && i.status !== 'closed',
    );
    const views = await Promise.all(intros.map((i) => this.buildIntroductionView(userId, i.id)));
    return views.filter((v): v is IntroductionView => v !== null);
  }

  async getIntroduction(userId: string, introductionId: string): Promise<IntroductionView | null> {
    return this.buildIntroductionView(userId, introductionId);
  }

  async submitDecision(
    userId: string,
    introductionId: string,
    decision: 'interested' | 'not_for_me',
  ): Promise<{ mutual: boolean; conversationId: string | null }> {
    const intro = this.state.introductions.find((i) => i.id === introductionId);
    if (!intro || (intro.userA !== userId && intro.userB !== userId)) {
      throw new Error('Introduction not found.');
    }

    // Idempotent: an already-matched introduction returns its existing conversation.
    if (intro.status === 'matched') {
      const existing = this.state.matches.find((m) => m.introductionId === introductionId);
      const conversation =
        existing && this.state.conversations.find((c) => c.matchId === existing.id);
      return { mutual: true, conversationId: conversation?.id ?? null };
    }

    this.upsertDecision(introductionId, userId, decision);

    if (decision === 'not_for_me') {
      intro.status = 'closed';
      await this.track(userId, 'introduction_rejected', { introductionId });
      return { mutual: false, conversationId: null };
    }

    await this.track(userId, 'introduction_interested', { introductionId });
    const otherId = intro.userA === userId ? intro.userB : intro.userA;

    // A seeded, responsive counterpart independently expresses interest.
    if (this.state.autoInterested.has(otherId)) {
      this.upsertDecision(introductionId, otherId, 'interested');
    }

    const bothInterested =
      this.decisionOf(introductionId, intro.userA) === 'interested' &&
      this.decisionOf(introductionId, intro.userB) === 'interested';

    if (!bothInterested) {
      return { mutual: false, conversationId: null };
    }

    // Guard against creating a duplicate match/conversation for the same pair.
    const existingMatch = this.state.matches.find((m) => m.introductionId === introductionId);
    if (existingMatch) {
      intro.status = 'matched';
      const conversation = this.state.conversations.find((c) => c.matchId === existingMatch.id);
      return { mutual: true, conversationId: conversation?.id ?? null };
    }

    intro.status = 'matched';
    const match = {
      id: uid('match'),
      introductionId,
      userA: intro.userA,
      userB: intro.userB,
      createdAt: nowIso(),
      closedAt: null,
    };
    this.state.matches.push(match);
    const conversation = {
      id: uid('conv'),
      matchId: match.id,
      createdAt: nowIso(),
      lastMessageAt: null,
    };
    this.state.conversations.push(conversation);
    await this.track(userId, 'mutual_interest', { introductionId });
    await this.track(userId, 'chat_started', { conversationId: conversation.id });
    return { mutual: true, conversationId: conversation.id };
  }

  async requestIntroduction(userId: string): Promise<IntroductionView | null> {
    const viewer = this.toMatchingProfile(userId);
    if (!viewer) return null;

    const ctx = this.eligibilityContext(userId);
    const candidates: MatchingProfile[] = [];
    for (const [otherId] of this.state.profiles) {
      if (otherId === userId) continue;
      const candidate = this.toMatchingProfile(otherId);
      if (candidate) candidates.push(candidate);
    }

    const ranked = rankCandidates(viewer, candidates, ctx);
    if (ranked.length === 0) return null;
    const top = ranked[0];

    const intro = {
      id: uid('intro'),
      userA: userId,
      userB: top.candidateId,
      status: 'active' as const,
      createdBy: null,
      rankScore: top.score,
      algoVersion: 'heuristic-v1',
      createdAt: nowIso(),
      expiresAt: null,
    };
    this.state.introductions.push(intro);
    return this.buildIntroductionView(userId, intro.id);
  }

  // -------------------------------------------------------------------------
  // Chat
  // -------------------------------------------------------------------------

  async listConversations(userId: string): Promise<ConversationView[]> {
    const views: ConversationView[] = [];
    for (const conversation of this.state.conversations) {
      const match = this.state.matches.find((m) => m.id === conversation.matchId);
      if (!match || (match.userA !== userId && match.userB !== userId)) continue;
      const otherId = match.userA === userId ? match.userB : match.userA;
      const otherProfile = this.state.profiles.get(otherId);
      if (!otherProfile) continue;
      const msgs = this.state.messages
        .filter((m) => m.conversationId === conversation.id)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      const last = msgs[msgs.length - 1] ?? null;
      const unreadCount = msgs.filter((m) => m.senderId !== userId && m.readAt === null).length;
      views.push({
        id: conversation.id,
        introductionId: match.introductionId,
        other: {
          userId: otherId,
          firstName: otherProfile.displayName,
          photoUrl: await this.primaryPhotoUrl(otherId),
        },
        lastMessage: last
          ? { body: last.body, createdAt: last.createdAt, senderId: last.senderId }
          : null,
        unreadCount,
      });
    }
    return views.sort((a, b) => {
      const at = a.lastMessage?.createdAt ?? '';
      const bt = b.lastMessage?.createdAt ?? '';
      return bt.localeCompare(at);
    });
  }

  async listMessages(userId: string, conversationId: string): Promise<Message[]> {
    this.requireConversationParticipant(userId, conversationId);
    return this.state.messages
      .filter((m) => m.conversationId === conversationId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async sendMessage(userId: string, conversationId: string, body: string): Promise<Message> {
    this.requireConversationParticipant(userId, conversationId);
    const otherId = this.conversationOther(userId, conversationId);
    if (otherId && this.isBlockedPair(userId, otherId)) {
      throw new Error('You can no longer message this person.');
    }
    const message: Message = {
      id: uid('msg'),
      conversationId,
      senderId: userId,
      body,
      createdAt: nowIso(),
      readAt: null,
    };
    this.state.messages.push(message);
    const conversation = this.state.conversations.find((c) => c.id === conversationId);
    if (conversation) conversation.lastMessageAt = message.createdAt;
    this.subscribers.get(conversationId)?.forEach((cb) => cb(message));
    return message;
  }

  async markConversationRead(userId: string, conversationId: string): Promise<void> {
    for (const message of this.state.messages) {
      if (
        message.conversationId === conversationId &&
        message.senderId !== userId &&
        message.readAt === null
      ) {
        message.readAt = nowIso();
      }
    }
  }

  subscribeMessages(conversationId: string, onMessage: MessageSubscriber): () => void {
    const set = this.subscribers.get(conversationId) ?? new Set();
    set.add(onMessage);
    this.subscribers.set(conversationId, set);
    return () => {
      set.delete(onMessage);
    };
  }

  // -------------------------------------------------------------------------
  // Safety
  // -------------------------------------------------------------------------

  async blockUser(userId: string, targetUserId: string): Promise<void> {
    if (!this.state.blocks.some((b) => b.blockerId === userId && b.blockedId === targetUserId)) {
      this.state.blocks.push({ blockerId: userId, blockedId: targetUserId, createdAt: nowIso() });
    }
    // Close any active conversation/intro between the two.
    for (const intro of this.state.introductions) {
      const pair = [intro.userA, intro.userB];
      if (pair.includes(userId) && pair.includes(targetUserId)) intro.status = 'closed';
    }
  }

  async reportUser(userId: string, input: ReportInput): Promise<void> {
    this.state.reports.push({
      id: uid('report'),
      reporterId: userId,
      reportedUserId: input.reportedUserId,
      category: input.category,
      contextType: input.contextType,
      contextId: input.contextId,
      note: input.note,
      status: 'open',
      createdAt: nowIso(),
    });
  }

  // -------------------------------------------------------------------------
  // Events & config
  // -------------------------------------------------------------------------

  async track(
    userId: string | null,
    eventType: ProductEventType,
    props: Record<string, string | number | boolean | null> = {},
  ): Promise<void> {
    this.state.events.push({
      id: uid('event'),
      userId,
      eventType,
      props,
      createdAt: nowIso(),
    });
  }

  async getFeatureFlags(): Promise<FeatureFlags> {
    return DEFAULT_FEATURE_FLAGS;
  }

  // -------------------------------------------------------------------------
  // Account (GDPR)
  // -------------------------------------------------------------------------

  async exportData(userId: string): Promise<UserDataExport> {
    return {
      exportedAt: nowIso(),
      profile: this.state.profiles.get(userId) ?? null,
      preferences: this.state.preferences.get(userId) ?? null,
      consents: this.state.consents.filter((c) => c.userId === userId),
      claims: this.state.claims.filter((c) => c.userId === userId),
      reflections: this.state.reflections.filter((r) => r.userId === userId),
      // rank_score is internal and must never leave the server, including exports.
      introductions: this.state.introductions
        .filter((i) => i.userA === userId || i.userB === userId)
        .map((i) => ({
          id: i.id,
          userA: i.userA,
          userB: i.userB,
          status: i.status,
          algoVersion: i.algoVersion,
          createdAt: i.createdAt,
          expiresAt: i.expiresAt,
        })),
      messages: this.state.messages.filter((m) => m.senderId === userId),
      photos: this.state.photos
        .filter((p) => p.userId === userId)
        .map((p) => ({ id: p.id, position: p.position, isPrimary: p.isPrimary })),
      dateOutcomes: this.state.dateOutcomes.filter((o) => o.userId === userId),
    };
  }

  async deleteAccount(userId: string): Promise<void> {
    this.state.reports = this.state.reports.map((report) => ({
      ...report,
      reporterId: report.reporterId === userId ? 'deleted' : report.reporterId,
      reportedUserId: report.reportedUserId === userId ? 'deleted' : report.reportedUserId,
      note: report.reporterId === userId ? '' : report.note,
    }));
    this.state.profiles.delete(userId);
    this.state.preferences.delete(userId);
    this.state.consents = this.state.consents.filter((c) => c.userId !== userId);
    this.state.photos = this.state.photos.filter((p) => p.userId !== userId);
    this.state.claims = this.state.claims.filter((c) => c.userId !== userId);
    this.state.revisions = this.state.revisions.filter((r) => r.userId !== userId);
    this.state.reflections = this.state.reflections.filter((r) => r.userId !== userId);
    this.state.dateOutcomes = this.state.dateOutcomes.filter((o) => o.userId !== userId);
    for (const record of this.state.usage) {
      if (record.userId === userId) record.userId = null;
    }
    for (const event of this.state.events) {
      if (event.userId === userId) event.userId = null;
    }
    for (const [email, session] of this.state.usersByEmail) {
      if (session.userId === userId) this.state.usersByEmail.delete(email);
    }
    if (this.state.session?.userId === userId) this.state.session = null;
  }

  /** AI usage metadata only — never includes prompts or reflection text. Tests use this. */
  aiUsageMetadata(): {
    taskType: AiTaskType;
    model: string;
    success: boolean;
    errorCode: string | null;
  }[] {
    return this.state.usage.map((record) => ({
      taskType: record.taskType,
      model: record.model,
      success: record.success,
      errorCode: record.errorCode,
    }));
  }

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  private requireProfile(userId: string): Profile {
    const profile = this.state.profiles.get(userId);
    if (!profile) throw new Error('Profile not found.');
    return profile;
  }

  private requireClaim(userId: string, claimId: string): Claim {
    const claim = this.state.claims.find((c) => c.id === claimId && c.userId === userId);
    if (!claim) throw new Error('Claim not found.');
    return claim;
  }

  private requireConversationParticipant(userId: string, conversationId: string): void {
    const conversation = this.state.conversations.find((c) => c.id === conversationId);
    const match = conversation && this.state.matches.find((m) => m.id === conversation.matchId);
    if (!match || (match.userA !== userId && match.userB !== userId)) {
      throw new Error('You are not a participant in this conversation.');
    }
  }

  private conversationOther(userId: string, conversationId: string): string | null {
    const conversation = this.state.conversations.find((c) => c.id === conversationId);
    const match = conversation && this.state.matches.find((m) => m.id === conversation.matchId);
    if (!match) return null;
    return match.userA === userId ? match.userB : match.userA;
  }

  private isBlockedPair(a: string, b: string): boolean {
    return this.state.blocks.some(
      (block) =>
        (block.blockerId === a && block.blockedId === b) ||
        (block.blockerId === b && block.blockedId === a),
    );
  }

  private upsertDecision(
    introductionId: string,
    userId: string,
    decision: 'interested' | 'not_for_me',
  ): void {
    const existing = this.state.decisions.find(
      (d) => d.introductionId === introductionId && d.userId === userId,
    );
    if (existing) {
      existing.decision = decision;
      existing.decidedAt = nowIso();
    } else {
      this.state.decisions.push({ introductionId, userId, decision, decidedAt: nowIso() });
    }
  }

  private decisionOf(introductionId: string, userId: string): 'interested' | 'not_for_me' | null {
    return (
      this.state.decisions.find((d) => d.introductionId === introductionId && d.userId === userId)
        ?.decision ?? null
    );
  }

  private upsertConfirmedClaim(
    userId: string,
    dimension: Dimension,
    value: string,
    sourceType: Claim['sourceType'],
    claimType: Claim['claimType'],
  ): Claim {
    // Supersede any existing confirmed claim for this dimension (keep history).
    const previousConfirmed = this.state.claims.find(
      (c) => c.userId === userId && c.dimension === dimension && c.status === 'confirmed',
    );
    const spec = DIMENSION_SPECS[dimension];
    const claim: Claim = {
      id: uid('claim'),
      userId,
      dimension,
      value,
      claimType,
      confidence: 'explicit_high',
      importance: previousConfirmed?.importance ?? spec.defaultImportance,
      status: 'confirmed',
      sourceType,
      supersededBy: null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    claim.confidence = deriveConfidence(claim);
    if (previousConfirmed) {
      previousConfirmed.status = 'superseded';
      previousConfirmed.supersededBy = claim.id;
      previousConfirmed.updatedAt = nowIso();
    }
    // Remove any lingering unconfirmed hypothesis for this dimension now resolved.
    this.state.claims = this.state.claims.filter(
      (c) => !(c.userId === userId && c.dimension === dimension && c.status === 'unconfirmed'),
    );
    this.state.claims.push(claim);
    return claim;
  }

  private recordRevision(
    userId: string,
    claimId: string | null,
    dimension: Dimension,
    previousValue: string | null,
    newValue: string | null,
    source: ModelRevision['source'],
    confirmed: boolean,
    reflectionEventId: string | null = null,
  ): void {
    this.state.revisions.push({
      id: uid('rev'),
      userId,
      claimId,
      dimension,
      previousValue,
      newValue,
      source,
      confirmed,
      reflectionEventId,
      createdAt: nowIso(),
    });
  }

  private modelSummary(userId: string): ModelSummaryItem[] {
    return this.state.claims
      .filter((c) => c.userId === userId && c.status === 'confirmed')
      .map((c) => ({ dimension: c.dimension, value: c.value, confidence: c.confidence }));
  }

  /** Builds the sanitized matching profile from CONFIRMED claims only. */
  private toMatchingProfile(userId: string): MatchingProfile | null {
    const profile = this.state.profiles.get(userId);
    const prefs = this.state.preferences.get(userId);
    if (!profile || !prefs || !profile.onboardingCompletedAt) return null;

    const dimensions = confirmedDimensions(this.state.claims.filter((c) => c.userId === userId));

    return {
      userId,
      age: ageFromDob(profile.dateOfBirth),
      gender: profile.gender,
      preferredGenders: prefs.preferredGenders,
      approxLat: profile.approxLat,
      approxLng: profile.approxLng,
      maxDistanceKm: prefs.maxDistanceKm,
      minAge: prefs.minAge,
      maxAge: prefs.maxAge,
      relationshipGoal: prefs.relationshipGoal,
      smoking: this.smokingHabit(userId),
      smokingDealbreaker: prefs.smokingDealbreaker,
      childrenIntent: prefs.childrenIntent,
      childrenDealbreaker: prefs.childrenDealbreaker,
      verificationStatus: profile.verificationStatus,
      moderationStatus: profile.moderationStatus,
      dimensions,
    };
  }

  private smokingHabit(userId: string): 'no' | 'sometimes' | 'yes' {
    const alcoholOrSmoke = this.state.claims.find(
      (c) => c.userId === userId && c.dimension === 'alcohol' && c.value === 'regular',
    );
    // Seeded Jonas is our smoker; keep a simple deterministic mapping for the demo.
    if (userId === 'jonas' || alcoholOrSmoke) return 'yes';
    return 'no';
  }

  private eligibilityContext(userId: string): EligibilityContext {
    const blocked = new Set<string>();
    for (const block of this.state.blocks) {
      if (block.blockerId === userId) blocked.add(block.blockedId);
      if (block.blockedId === userId) blocked.add(block.blockerId);
    }
    const alreadyIntroduced = new Set<string>();
    for (const intro of this.state.introductions) {
      if (intro.userA === userId) alreadyIntroduced.add(intro.userB);
      if (intro.userB === userId) alreadyIntroduced.add(intro.userA);
    }
    const rejected = new Set<string>();
    for (const decision of this.state.decisions) {
      if (decision.decision !== 'not_for_me') continue;
      const intro = this.state.introductions.find((i) => i.id === decision.introductionId);
      if (!intro) continue;
      if (decision.userId === userId) {
        rejected.add(intro.userA === userId ? intro.userB : intro.userA);
      } else if (intro.userA === userId || intro.userB === userId) {
        rejected.add(decision.userId);
      }
    }
    return {
      blockedUserIds: blocked,
      alreadyIntroducedUserIds: alreadyIntroduced,
      previouslyRejectedUserIds: rejected,
    };
  }

  private async buildRevealProfile(userId: string): Promise<RevealProfile | null> {
    const profile = this.state.profiles.get(userId);
    if (!profile) return null;
    const photos = await this.listPhotos(userId);
    const resolved = await Promise.all(
      photos.map(async (p) => ({ id: p.id, url: await this.getPhotoUrl(p.storagePath) })),
    );
    return {
      userId,
      firstName: profile.displayName,
      age: ageFromDob(profile.dateOfBirth),
      city: profile.city,
      area: profile.area,
      occupation: profile.showOccupation ? profile.occupation : null,
      bio: profile.bio,
      verified: profile.verificationStatus === 'selfie_verified',
      photos: resolved,
    };
  }

  private async primaryPhotoUrl(userId: string): Promise<string | null> {
    const photos = await this.listPhotos(userId);
    const primary = photos.find((p) => p.isPrimary) ?? photos[0];
    return primary ? this.getPhotoUrl(primary.storagePath) : null;
  }

  private async buildExplanation(
    viewerId: string,
    otherId: string,
  ): Promise<IntroductionExplanationView> {
    const viewer = this.toMatchingProfile(viewerId);
    const other = this.toMatchingProfile(otherId);
    if (!viewer || !other) {
      return { alignment: [], friction: [], unknowns: [], generatedBy: 'fallback' };
    }
    const compatibility = computeCompatibility(viewer, other);
    const fallback = buildFallbackExplanation(compatibility);

    // Build sanitized facts (dimensions + labels only) for the AI phrasing step.
    const facts: ExplanationFact[] = [];
    for (const c of compatibility.alignment.slice(0, 3)) {
      const spec = DIMENSION_SPECS[c.dimension];
      facts.push({
        dimension: c.dimension,
        kind: 'alignment',
        sharedLabel: spec.valueLabels[c.viewerValue] ?? c.viewerValue,
      });
    }
    for (const c of compatibility.friction.slice(0, 2)) {
      const spec = DIMENSION_SPECS[c.dimension];
      facts.push({
        dimension: c.dimension,
        kind: 'friction',
        viewerLabel: spec.valueLabels[c.viewerValue] ?? c.viewerValue,
        otherLabel: spec.valueLabels[c.otherValue] ?? c.otherValue,
      });
    }
    for (const dimension of compatibility.unknowns.slice(0, 2)) {
      facts.push({ dimension, kind: 'unknown' });
    }

    const ai = await this.runAi('generate_explanation', () =>
      this.ai.generateIntroductionExplanation({ facts }),
    );

    if (!ai) {
      return {
        alignment: fallback.alignment,
        friction: fallback.friction,
        unknowns: fallback.unknowns,
        generatedBy: 'fallback',
      };
    }

    const toPoints = (texts: string[], dims: (Dimension | null)[]): ExplanationPoint[] =>
      texts.map((text, index) => ({ text, dimension: dims[index] ?? null }));

    return {
      alignment: toPoints(
        ai.alignment,
        compatibility.alignment.slice(0, 3).map((c) => c.dimension),
      ),
      friction: toPoints(
        ai.friction,
        compatibility.friction.slice(0, 2).map((c) => c.dimension),
      ),
      unknowns: toPoints(ai.unknowns, compatibility.unknowns.slice(0, 2)),
      generatedBy: 'llm',
    };
  }

  private async buildIntroductionView(
    userId: string,
    introductionId: string,
  ): Promise<IntroductionView | null> {
    const intro = this.state.introductions.find((i) => i.id === introductionId);
    if (!intro || (intro.userA !== userId && intro.userB !== userId)) return null;
    const otherId = intro.userA === userId ? intro.userB : intro.userA;
    const other = await this.buildRevealProfile(otherId);
    if (!other) return null;

    const explanation = await this.buildExplanation(userId, otherId);
    const myDecision = this.decisionOf(introductionId, userId);
    const mutual = intro.status === 'matched';
    let conversationId: string | null = null;
    if (mutual) {
      const match = this.state.matches.find((m) => m.introductionId === introductionId);
      const conversation = match && this.state.conversations.find((c) => c.matchId === match.id);
      conversationId = conversation?.id ?? null;
    }

    return {
      id: intro.id,
      status: intro.status,
      createdAt: intro.createdAt,
      other,
      explanation,
      myDecision,
      mutual,
      conversationId,
    };
  }

  // -----------------------------------------------------------------------
  // Engagement v2 methods
  // -----------------------------------------------------------------------

  async getHomeState(userId: string): Promise<HomeStateView> {
    const intros = await this.listIntroductions(userId);
    const matchDrop = intros.find((i) => i.status === 'active' && i.myDecision === null) ?? null;
    const revisionCard = await this.getLatestRevisionCard(userId);
    const microScenario = await this.getMicroScenario(userId);
    const weeklyRecap = await this.getWeeklyRecap(userId);
    const hasPredictionGame = (await this.getPredictionGame(userId)) !== null;
    return { matchDrop, revisionCard, microScenario, weeklyRecap, hasPredictionGame };
  }

  async getNotebook(userId: string): Promise<NotebookView> {
    const claims = this.state.claims.filter((c) => c.userId === userId);
    const revisions = this.state.revisions.filter((r) => r.userId === userId);
    return buildNotebook(claims, revisions);
  }

  async getLatestRevisionCard(userId: string): Promise<RevisionCardView | null> {
    const revisions = this.state.revisions.filter((r) => r.userId === userId);
    const card = buildRevisionCard(revisions);
    if (!card || this.state.acknowledgedRevisionIds.has(card.revisionId)) return null;
    return card;
  }

  async acknowledgeRevisionCard(
    userId: string,
    revisionId: string,
    response: 'exactly' | 'sort_of' | 'not_really',
  ): Promise<void> {
    this.state.acknowledgedRevisionIds.add(revisionId);
    const revision = this.state.revisions.find((r) => r.id === revisionId && r.userId === userId);
    if (!revision || !revision.claimId) return;

    if (response === 'exactly') {
      await this.confirmClaim(userId, revision.claimId);
    } else if (response === 'not_really') {
      await this.rejectClaim(userId, revision.claimId);
    }
    // 'sort_of' — acknowledged but no automatic change
  }

  async getMicroScenario(userId: string): Promise<MicroScenarioView | null> {
    const flags = await this.getFeatureFlags();
    if (!flags.microScenariosEnabled) return null;

    const existing = this.state.microScenarios.find(
      (s) => s.userId === userId && s.status === 'pending',
    );
    if (existing) {
      return {
        id: existing.id,
        targetDimension: existing.targetDimension,
        prompt: existing.prompt,
        options: existing.options,
        reason: existing.reason,
      };
    }

    const confirmed = new Set(
      this.state.claims
        .filter((c) => c.userId === userId && c.status === 'confirmed')
        .map((c) => c.dimension),
    );
    const recentCount = this.state.microScenarios.filter(
      (s) =>
        s.userId === userId &&
        s.status === 'answered' &&
        Date.now() - new Date(s.createdAt).getTime() < 7 * 86_400_000,
    ).length;
    const answeredIds = new Set(
      this.state.microScenarios
        .filter((s) => s.userId === userId && s.status !== 'pending')
        .map((s) => s.scenarioType),
    );

    const template = selectScenario(confirmed, recentCount, answeredIds);
    if (!template) return null;

    const scenario = scenarioToMicroScenario(userId, template);
    this.state.microScenarios.push(scenario);
    return {
      id: scenario.id,
      targetDimension: scenario.targetDimension,
      prompt: scenario.prompt,
      options: scenario.options,
      reason: scenario.reason,
    };
  }

  async answerMicroScenario(userId: string, scenarioId: string, value: string): Promise<Claim> {
    const scenario = this.state.microScenarios.find(
      (s) => s.id === scenarioId && s.userId === userId,
    );
    if (scenario) {
      scenario.status = 'answered';
      scenario.answeredAt = nowIso();
    }

    const dimension = scenario?.targetDimension ?? ('planning_style' as Dimension);
    return this.answerMicroQuestion(userId, dimension, value);
  }

  async getPredictionGame(userId: string): Promise<PredictionGameView | null> {
    const flags = await this.getFeatureFlags();
    if (!flags.predictionGameEnabled) return null;

    const existing = this.state.predictionEvents.find(
      (p) => p.userId === userId && p.actualChoice === null,
    );
    if (existing) return predictionToView(existing);

    const recent = this.state.predictionEvents.filter(
      (p) =>
        p.userId === userId &&
        Date.now() - new Date(p.createdAt).getTime() < 7 * 86_400_000,
    );
    if (recent.length >= 2) return null;

    const confirmed = this.state.claims.filter(
      (c) => c.userId === userId && c.status === 'confirmed',
    );
    const pair = buildPredictionPair(confirmed);
    if (!pair) return null;

    const event = createPredictionEvent(userId, pair);
    this.state.predictionEvents.push(event);
    return predictionToView(event);
  }

  async submitPrediction(
    userId: string,
    predictionId: string,
    choice: 'a' | 'b',
    reason: string | null,
  ): Promise<PredictionResultView> {
    const event = this.state.predictionEvents.find(
      (p) => p.id === predictionId && p.userId === userId,
    );
    if (!event) throw new Error('prediction not found');

    const { updated, result } = resolvePrediction(event, choice, reason);
    Object.assign(event, updated);
    return result;
  }

  async getWeeklyRecap(userId: string): Promise<WeeklyRecapView | null> {
    const flags = await this.getFeatureFlags();
    if (!flags.weeklyRecapEnabled) return null;

    const claims = this.state.claims.filter((c) => c.userId === userId);
    const revisions = this.state.revisions.filter((r) => r.userId === userId);

    const hasCandidate = this.state.introductions.some(
      (i) =>
        (i.userA === userId || i.userB === userId) &&
        i.status === 'active',
    );

    return buildWeeklyRecap(claims, revisions, hasCandidate);
  }

  async getConversationStarter(
    userId: string,
    conversationId: string,
  ): Promise<ConversationStarterView | null> {
    const flags = await this.getFeatureFlags();
    if (!flags.conversationStarterEnabled) return null;

    const conv = this.state.conversations.find((c) => c.id === conversationId);
    if (!conv) return null;

    const match = this.state.matches.find((m) => m.id === conv.matchId);
    if (!match) return null;

    const intro = this.state.introductions.find((i) => i.id === match.introductionId);
    if (!intro) return null;

    const otherId = intro.userA === userId ? intro.userB : intro.userA;
    const explanation = await this.buildExplanation(userId, otherId);
    return buildConversationStarter(explanation.alignment, explanation.friction);
  }

  private async runAi<T>(task: AiTaskType, fn: () => Promise<T>): Promise<T | null> {
    const started = Date.now();
    try {
      const result = await fn();
      this.state.usage.push({
        id: uid('ai'),
        userId: this.state.session?.userId ?? null,
        taskType: task,
        model: this.ai.name,
        latencyMs: Date.now() - started,
        inputTokens: null,
        outputTokens: null,
        success: true,
        errorCode: null,
        createdAt: nowIso(),
      });
      return result;
    } catch (error) {
      logDev('ai_failure', { task, error: String(error) });
      this.state.usage.push({
        id: uid('ai'),
        userId: this.state.session?.userId ?? null,
        taskType: task,
        model: this.ai.name,
        latencyMs: Date.now() - started,
        inputTokens: null,
        outputTokens: null,
        success: false,
        errorCode: 'ai_error',
        createdAt: nowIso(),
      });
      return null;
    }
  }
}
