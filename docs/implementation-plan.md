# Kindred — Implementation Plan

This is the working implementation plan for the Kindred MVP. It reflects the approved plan and
is kept in sync as phases land. See also [architecture.md](architecture.md),
[ai-architecture.md](ai-architecture.md), and [privacy-architecture.md](privacy-architecture.md).

## Product in one line

A private AI matchmaker that gradually learns who a user actually connects with, improves from
real dating outcomes, and introduces them to **fewer people for reasons it can explain**.

The differentiator is not "we use AI"; it is an **evidence-backed, user-correctable,
outcome-informed** model of a person that drives fewer, more meaningful introductions.

## Fixed technical decisions

- **Expo SDK 57**, React Native 0.86, **Expo Router**, **TypeScript strict**. Versions pinned to
  Expo-compatible releases via `npx expo install`.
- **Trust boundary = Supabase Edge Functions (Deno).** All AI and privileged operations run
  server-side. The app never holds `OPENAI_API_KEY` or the service-role key.
- **`Backend` interface** with `DevBackend` (in-memory + seed, powers local/preview/tests) and a
  Supabase implementation (authored under `supabase/`). Selected via `EXPO_PUBLIC_BACKEND`.
- **`AIProvider` interface** with the deterministic `MockAIProvider` (dev/tests) and the OpenAI
  Responses API provider (server-only). Model routing config-driven (`gpt-5.6-luna` /
  `gpt-5.6-terra`).
- TanStack Query (server state), Zustand (small client state), React Hook Form + **Zod** (forms +
  AI output validation). A small internal design system (tokens + primitives), light/dark.
- A **pure, dependency-free matching engine** consumed by both the app/tests and server functions.

## Environment constraints (honest)

- The development VM has **no Docker and no OpenAI key**, so the live Supabase stack and live AI
  cannot be exercised here. The `DevBackend` + `MockAIProvider` make the entire product loop
  runnable and testable regardless; the Supabase migrations/functions are authored as the
  canonical production server and are exercised on a machine with Docker (or a hosted project).

## Non-negotiable product principles

See [AGENTS.md](../AGENTS.md) for the durable list. In short: no swipe deck, no popularity
mechanics, no fake compatibility percentages, the AI never dates for the user, personality-first
but not blind, private memory never leaks, LLM output is never the source of truth, deterministic
matching, sensitive attributes never inferred, 18+, GDPR-oriented.

## Data model (summary)

`Claim + Evidence` is the fundamental object (see `src/types/domain.ts`). Entities:
`profiles`, `profile_photos`, `dating_preferences`, `sensitive_consents`, `user_claims`,
`claim_evidence` (immutable), `model_revisions`, `reflection_events` (private), `introductions`
(internal `rank_score`), `introduction_explanations` (per-recipient), `introduction_decisions`
(double-blind), `matches`, `conversations`, `messages`, `reports`, `blocks`,
`verification_requests`, `push_tokens`, `product_events`, `date_outcomes`, `ai_usage_log`,
`app_config`.

## Matching pipeline

Deterministic and unit-tested (`src/features/matching/`):

1. **Eligibility** — mutual gender preference, mutual age range, distance, blocks, already
   introduced, previously rejected, moderation, relationship-goal opposition.
2. **Hard boundaries** — smoking and children dealbreakers (both directions).
3. **Structured compatibility** — confirmed claims only; unknowns never count as positive.
4. **Uncertainty** — propose a micro-question when a high-impact dimension is unknown and the
   candidate cares (recency enforced by the caller).
5. **Ranking** — deterministic score + small exploration bonus; never surfaced to users.
6. **Explanation** — LLM phrases approved structured evidence; deterministic fallback otherwise.

`candidateScore = alignmentWeight·alignment − frictionWeight·friction + explorationBonus`,
gated by hard eligibility. Weights are configurable.

## End-to-end acceptance loop

Sign up → age gate → minimal onboarding + photos + verification state → talk to matchmaker →
AI proposes an unconfirmed insight → user confirms → visible in "What my matchmaker knows" →
system creates an introduction to a compatible user → evidence-grounded explanation → user reads
explanation first, then sees photos, chooses Interested → the other independently chooses
Interested → mutual → human chat → messages → mark that a date happened → private reflection →
AI proposes a model update → user confirms/edits → future matching reflects the confirmed revision.

## Phases

Each phase ends with `npm run typecheck`, `npm run lint`, `npm test`, fixes, a change summary,
remaining risks, then commit + push.

- **Phase 0 — Foundation.** ✅ Done. Expo scaffold, design system, domain types, matching engine + tests,
  AI schemas + mock, `Backend` interface + `DevBackend` + seed, app shell (providers, navigation,
  auth, tabs, introduction/chat/reflection/matchmaker/me screens, onboarding wizard), docs,
  `AGENTS.md`, README, `.env.example`, supabase scaffold.
- **Phase 1 — Auth + onboarding backing.** ✅ Done. Supabase migrations + RLS for profiles/photos/
  preferences/consents/verification; onboarding validation + age-gate + consent unit tests.
- **Phase 2 — Relationship model.** ✅ Done. Claims/evidence/confidence + "What my matchmaker knows" +
  edit/correct/reject; tests that unconfirmed/rejected claims never affect matching + revisions
  preserve history.
- **Phase 3 — AI matchmaker.** ✅ Done. Edge Function OpenAI provider (Responses API + Structured Outputs),
  reflection extraction, hypothesis→confirm flow, deterministic fallback; schema-validation and
  prompt-injection tests.
- **Phase 4 — Matching.** ✅ Done. Full pipeline migrations/functions, concierge introduction RPC +
  operator doc, expanded unit tests.
- **Phase 5 — Introduction UX.** ✅ Done. Explanation-first → photo reveal → Interested/Not-for-me →
  double-blind mutual.
- **Phase 6 — Human chat.** ✅ Done. Realtime messaging, participant-only RLS, block/report,
  empty/pagination/optimistic states.
- **Phase 7 — Outcome learning.** ✅ Done. Date-happened, post-date reflection, claim revision, second-date
  intent.
- **Phase 8 — Privacy / safety / reliability.** ✅ Done. Data export + deletion/anonymization, RLS review,
  abuse flows, error states, `ai_usage_log` cost instrumentation.
- **Phase 9 — Polish.** ✅ Done. Animation, accessibility, skeletons, Expo notifications (generic copy),
  seeded demo flow, README completion.

## Phase acceptance criteria

**Phase 0:** app boots; `tsc --noEmit` strict + ESLint + Jest green; router groups with real
screens; design tokens + primitives; `DevBackend`/`MockAIProvider` wired; supabase scaffold;
docs + `AGENTS.md` + README + `.env.example`; web preview renders; committed + pushed.

**Phase 1:** email OTP + 18+ age gate (DOB private); ~5–7 minute onboarding covering city,
gender + partner preference + consent, relationship goal, age range, distance, dealbreakers,
2–4 style questions, photos, verification state; RHF/Zod validation; `onboarding_started/
completed` events; profiles/preferences/consents/photos/verification migrations + RLS;
onboarding + age + consent unit tests; typecheck/lint/test green; committed + pushed.

**Phase 7:** date-happened + second-date intent stored privately per user (upsert); post-date
reflection persisted before AI runs; AI proposes unconfirmed revisions; only confirmed revisions
enter matching; rejected revisions are recorded and ignored; private reflection text never appears
in introduction explanations; typecheck/lint/test green; committed + pushed.

**Phase 8:** `export_own_data` / `exportData` (own rows only, no `rank_score`); `delete_own_account`
removes personal data and anonymizes reports; RLS inventory; block/report abuse flows; calm error
copy for offline / LLM timeout / malformed / upload / stale chat; `ai_usage_log` metadata without
prompts; typecheck/lint/test green; committed + pushed.

**Phase 9:** skeleton animation via design tokens; accessibility labels on buttons, chips, tabs,
chat composer, and lists; Expo notifications scaffolding with generic lock-screen copy; seeded demo
walkthrough in README; MIT LICENSE; typecheck/lint/test green; committed + pushed.
