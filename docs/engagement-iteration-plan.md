# Engagement Iteration Plan

Second product iteration for Kindred. Adds curiosity-driven engagement and matchmaker
learning UX on top of the existing MVP. One logical commit.

## Design principle

High anticipation, low screen time. Every feature supports the learning loop:
curiosity → self-discovery → anticipation → match drop → human reward → reflection →
model update → curiosity. No dark patterns, no infinite feed, no streaks, no fake scarcity.

## What already exists (and stays unchanged)

- Full claim/evidence/revision system (`user_claims`, `claim_evidence`, `model_revisions`)
- AI abstraction (`AIProvider` + `MockAIProvider` + 4 Edge Functions)
- Matching pipeline (eligibility → hard boundaries → compatibility → uncertainty → ranking)
- Introduction flow (explanation-first → profile → decision → double-blind mutual)
- Human chat with Supabase Realtime
- Post-date reflection with AI revision proposals
- "What my matchmaker knows" screen with edit/correct/reject
- Micro-question system (one contextual question)
- Feature flags, product events, design system (tokens + primitives + light/dark)

## What this iteration adds

### 1. Domain types + backend methods (data model layer)

New types in `src/types/domain.ts`:
- `MicroScenario` — scenario-based question with `targetDimension`, `scenarioType`, `prompt`,
  `options`, `reason`, `candidateId | null`, `status`, `answeredAt`
- `PredictionEvent` — "Would I get you right?" with `candidateAPayload`, `candidateBPayload`,
  `predictedChoice`, `actualChoice`, `correct`, `reason`
- `ConversationStarter` — grounded suggestion after mutual interest
- Extend `ProductEventType` with new event names

New types in `src/types/views.ts`:
- `NotebookSection` — grouped insights with `prettySure`, `reconsidering`, `figuringOut`
- `WeeklyRecapView` — learned / stopped-assuming / still-curious / promising-candidate
- `MatchDropState` — explicit state enum for introduction lifecycle
- `ConversationStarterView`

New `Backend` methods (added to interface + `DevBackend`):
- `getMatchDropState(userId)` → current home state
- `getMicroScenario(userId)` → scenario-based question (or null)
- `answerMicroScenario(userId, scenarioId, value)` → Claim
- `getPredictionGame(userId)` → candidate-pair prediction (or null)
- `submitPrediction(userId, predictionId, choice, reason?)` → result
- `getNotebook(userId)` → `NotebookSection`
- `getWeeklyRecap(userId)` → `WeeklyRecapView | null`
- `getConversationStarter(userId, conversationId)` → `ConversationStarterView | null`
- `getLatestRevisionCard(userId)` → "I changed my mind" card (or null)
- `acknowledgeRevisionCard(userId, revisionId, response)` → Claim update

New feature flags:
- `matchDropEnabled` (default true)
- `microScenariosEnabled` (default true)
- `predictionGameEnabled` (default true)
- `weeklyRecapEnabled` (default true)
- `conversationStarterEnabled` (default true)

### 2. Micro-scenario templates

New file `src/features/matchmaker/scenarios.ts`:
- 8–10 predefined scenario templates grouped by `targetDimension`
- Each has a short narrative, response options, and a mapping to claim values
- `selectScenario(userId, existingClaims, flags)` — picks a relevant scenario
  only when matching value exists, frequency limits respected

### 3. Match Drop UX (home screen + introduction screen)

Modify `src/app/(tabs)/index.tsx`:
- Replace the current active-introduction card with a **Match Drop** card
- Show: "Your matchmaker found someone worth looking at." + "See why" CTA
- One-line preview of the top alignment point
- Track `match_drop_opened` event

Modify `src/app/introduction/[id].tsx`:
- Rephrase explanation stage with warmer copy:
  "Why they stood out" / "One difference" / "One thing I'm still unsure about"
- Improve the mutual-interest result stage:
  "You were both curious." + "I thought the two of you might have something worth exploring."
- Add optional conversation starter below mutual-interest card

### 4. Matchmaker Notebook

New file `src/features/matchmaker/notebook.ts`:
- `buildNotebook(claims, revisions)` — pure function that categorizes insights into:
  - **Pretty sure** — confirmed, stable (no recent revision)
  - **I'm reconsidering** — confirmed but recently revised or with contradictory evidence
  - **Still figuring out** — unconfirmed or low-confidence dimensions

Modify `src/app/model.tsx`:
- Rename header to "Your matchmaker's notebook"
- Render three sections instead of flat group-by-dimension
- Keep inline editing/correcting/forgetting

### 5. "I changed my mind" revision cards

New component + logic in `src/features/matchmaker/revisionCard.ts`:
- Derive from existing `model_revisions` — find the latest confirmed revision where
  `previous_value` differs meaningfully from `new_value`
- Surface as a card on the Matchmaker tab: "I changed my mind about something."
- Tap reveals the old belief vs new belief with "Does that sound right?" (Exactly / Sort of / Not really)
- Uses existing `confirmClaim` / `rejectClaim` / `editClaim` — no parallel memory system

### 6. Surprise / contradiction moments

Integrated into the DevBackend `submitDecision` path:
- When a user chooses "interested" and the candidate has a trait that conflicts with the
  user's confirmed preference, store a `contradiction_noticed` flag
- Surface on the Matchmaker tab as "That surprised me." card
- Options: "His personality overall" / "The [trait] didn't bother me" / "Something else" / "Not sure"
- Response becomes `decision_behavior` evidence — does NOT auto-rewrite preferences

### 7. "Would I get you right?" prediction game

New file `src/features/matchmaker/prediction.ts`:
- `buildPredictionPair(userId, claims, candidates)` — picks two sanitized candidate
  summaries from the pool (using only sharable trait labels, not private data)
- `predictChoice(claims, candidateA, candidateB)` — deterministic prediction from
  confirmed dimensions (alignment score comparison)
- Store: `model_prediction`, `user_choice`, `correct`, `model_version`, `timestamp`

New screen `src/app/prediction.tsx`:
- Shows two candidate summaries (trait labels only, no photos/names)
- User picks one → reveal whether matchmaker got it right
- "What mattered most?" follow-up options
- Track `prediction_game_started`, `prediction_game_answered`, `prediction_correct/incorrect`

### 8. Improved post-date reflection

Modify `src/app/reflection/[introductionId].tsx`:
- Rephrase step 2 heading: "How did it actually feel?"
- After AI extraction, show "One thing I learned" card instead of generic proposal list
- Simpler 3-button flow: "Yep" / "Partly" / "Not quite"
- Still uses existing `confirmRevision` / `rejectRevision`

### 9. Weekly recap

New file `src/features/matchmaker/recap.ts`:
- `buildWeeklyRecap(claims, revisions, introductions, flags)` — derives from existing data
- Sections: "I learned" / "I stopped assuming" / "I'm still curious about"
- Optional "One person currently looks especially promising" (only if real candidate exists)

Show as a card on Home (below introduction / above empty state) when recap is available.

### 10. Home screen evolution

Modify `src/app/(tabs)/index.tsx`:
- Priority-based module rendering:
  1. Match Drop (if introduction available)
  2. "I changed my mind" revision card (if pending)
  3. Micro-scenario (if available and enabled)
  4. Weekly recap (if available)
  5. Calm empty state (enhanced with notebook preview link)
- Never show all modules at once — relevance-based
- Track relevant events for each module viewed

### 11. Conversation starter

After mutual interest, derive one grounded suggestion from shared explanation-safe traits.
- `buildConversationStarter(explanationFacts)` — picks a shared or contrasting trait
- Show in chat screen header: "Something you might enjoy talking about: ..."
- Buttons: "Use this" (pre-fills composer) / "Skip" (dismisses)
- Track `conversation_starter_viewed`, `conversation_starter_used`, `conversation_starter_skipped`
- Never uses private memory — only explanation-safe data

### 12. New feature flags + events

Feature flags added to `FeatureFlags` type and `DEFAULT_FEATURE_FLAGS`.

New product events added to `PRODUCT_EVENTS`:
- `match_drop_opened`, `match_reason_viewed`, `match_profile_viewed`
- `matchmaker_insight_viewed`, `matchmaker_insight_confirmed`,
  `matchmaker_insight_partially_confirmed`, `matchmaker_insight_rejected`
- `micro_scenario_viewed`, `micro_scenario_answered`, `micro_scenario_skipped`
- `prediction_game_started`, `prediction_game_answered`, `prediction_correct`, `prediction_incorrect`
- `weekly_recap_viewed`
- `conversation_starter_viewed`, `conversation_starter_used`, `conversation_starter_skipped`

## Migration

One new migration: `20260901001000_engagement_v2.sql`
- `micro_scenarios` table (user_id, target_dimension, scenario_type, prompt, options JSONB,
  reason, candidate_id nullable, status, created_at, answered_at)
- `prediction_events` table (user_id, prediction_type, candidate_a_payload JSONB,
  candidate_b_payload JSONB, predicted_choice, actual_choice, correct boolean,
  model_version, reason, created_at)
- New feature flag rows in `app_config`
- RLS: owner-only on both new tables

## Tests

New test files:
- `src/features/matchmaker/__tests__/notebook.test.ts` — section categorization
- `src/features/matchmaker/__tests__/scenarios.test.ts` — frequency limits, dimension validity,
  no sensitive dimensions
- `src/features/matchmaker/__tests__/prediction.test.ts` — prediction stored before reveal,
  incorrect prediction does not rewrite preferences
- `src/features/matchmaker/__tests__/recap.test.ts` — derived from real data, no fake activity
- `src/features/matchmaker/__tests__/revisionCard.test.ts` — uses existing claim system
- `src/features/matchmaker/__tests__/conversationStarter.test.ts` — no private data leaks
- `src/services/backend/__tests__/engagement.test.ts` — integration tests for new Backend methods

## Files touched (summary)

Modified:
- `src/types/domain.ts` — new types, extended event types
- `src/types/views.ts` — new view types, extended FeatureFlags
- `src/services/backend/types.ts` — new Backend methods
- `src/services/backend/devBackend.ts` — implement new methods
- `src/services/backend/seed.ts` — add scenario/prediction seed data
- `src/app/(tabs)/index.tsx` — home screen evolution
- `src/app/(tabs)/matchmaker.tsx` — revision cards, surprise moments
- `src/app/introduction/[id].tsx` — match drop UX, mutual moment, conversation starter
- `src/app/reflection/[introductionId].tsx` — "one thing I learned" flow
- `src/app/model.tsx` — matchmaker notebook sections
- `src/app/chat/[conversationId].tsx` — conversation starter
- `src/app/(tabs)/me.tsx` — rename notebook link
- `src/lib/featureFlags.ts` — new flags

New:
- `src/features/matchmaker/notebook.ts`
- `src/features/matchmaker/scenarios.ts`
- `src/features/matchmaker/prediction.ts`
- `src/features/matchmaker/recap.ts`
- `src/features/matchmaker/revisionCard.ts`
- `src/features/matchmaker/conversationStarter.ts`
- `src/features/matchmaker/hooks.ts`
- `src/app/prediction.tsx`
- `supabase/migrations/20260901001000_engagement_v2.sql`
- 7 new test files
- `docs/engagement-iteration-plan.md` (this file)

## Risks

- Prediction game candidate summaries must not leak private data — use only dimension labels
  from the matchmaker's confirmed model, never raw profile text or photos.
- Weekly recap must never fabricate activity — only derive from real events.
- Micro-scenarios must respect frequency limits and never generate sensitive dimensions.
- Conversation starter must use only explanation-safe traits (same as introduction explanation).
- All new features are behind feature flags for safe rollout.
