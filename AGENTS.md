# AGENTS.md — Durable rules for Kindred

This file encodes the **non-negotiable product and architecture decisions** for Kindred,
a private AI matchmaker. Future agents: read this before changing anything. These rules
protect the core product thesis. If a change appears to violate one, stop and reconsider.

## The thesis (do not lose this)

Kindred is **a private AI matchmaker that gradually learns who a user actually connects
with, improves from real dating outcomes, and introduces them to fewer people for reasons
it can explain.** The differentiator is not "we use AI" — it is the **evidence-backed,
user-correctable, outcome-informed** model of a person that drives **fewer, more meaningful
introductions.**

## Product invariants (never violate)

1. **No swipe deck / no infinite catalog.** Max 1–2 introductions per week (configurable via
   `feature flags`). No browse feed.
2. **No popularity or marketplace mechanics.** No like counts, match counts as status,
   attractiveness/desirability scores, Elo, boosts, super-likes, or public metrics.
3. **No fake compatibility percentages.** Never show "92% compatible", soulmate/readiness
   scores, or attraction probability. Explanations use only three buckets:
   **Strong alignment / Possible friction / Still unknown**, and every sentence must trace
   back to structured data.
4. **The AI does not date for the user.** No AI avatars, no AI-to-AI flirting, no AI-mediated
   emotional relationship before photos, no AI impersonation in human chat.
5. **Personality-first, not blind.** Introduction UX order is: explanation first → then
   photos/profile → the user MUST see photos before deciding → Interested / Not for me.
   Chat opens only when **both** independently choose Interested (double-blind). A rejection
   is **never** disclosed to the other person.

## The learning loop (the core of the company)

state preferences → provisional model → introduction → accept/reject → human chat → date →
private reflection → AI proposes insight → **user confirms/corrects** → model improves →
future introductions improve. Do not break this loop while adding features.

## The critical AI rule

**LLM output is NEVER the source of truth.** Inferred claims are created as `unconfirmed`
and MUST be confirmed by the user before they can meaningfully influence matching. The
matching engine reads **confirmed claims only**. See `src/features/matching/engine.ts`
(`toMatchingProfile` uses `status === 'confirmed'` only).

- Stated vs revealed preferences stay separate. Contradictions are information, not errors.
- Confidence is a **discrete, deterministically-derived tier** (`src/features/claims/confidence.ts`),
  never an LLM-invented float. The UI communicates uncertainty with **language**, not fake precision.
- The LLM may only **phrase** approved structured evidence into natural language. It must not
  invent evidence. All AI outputs are validated with Zod strict schemas
  (`src/services/ai/schemas.ts`); unknown/hallucinated fields are rejected.

## Data model

The fundamental object is **Claim + Evidence**, not a giant persona JSON.
See `src/types/domain.ts`.

- `Claim { dimension, value, claimType(stated|observed|hypothesis), status(unconfirmed|confirmed|rejected|superseded), confidence, importance, sourceType }`
- Evidence is stored independently and is **immutable** (never overwrite history).
- `model_revisions` preserves an auditable trail of every change.
- Use the focused ontology in `DIMENSIONS` (~15 dimensions). Do NOT add speculative
  psychological dimensions or diagnose attachment style, trauma, disorders, or mental illness.

## Privacy invariants (fundamental)

- One user's private matchmaker memory (reflections, full claim history, private preferences)
  must **never** be accessible to another user or another user's matchmaker.
- Peers only ever receive a `RevealProfile` projection (`src/types/views.ts`): first name, age
  (never DOB), broad area (never exact coordinates), opt-in occupation, bio, verified flag,
  signed photo URLs. Nothing else.
- Private reflection text must never appear in an introduction explanation. Explanations expose
  only allowed matching facts (e.g. "You both place strong importance on trust.").
- Sensitive attributes (orientation labels, religion, politics, ethnicity, health, income,
  trauma, etc.) are **never inferred** and never used as ranking signals. Only an explicit
  partner-gender preference is stored, after explicit consent.
- Location is city / broad area / approximate radius only. Coordinates are coarsened.

## Trust boundary (secrets)

- The mobile app must NEVER contain OpenAI keys, the Supabase service-role key, admin secrets,
  or vendor secrets. All AI calls and privileged operations happen **server-side**
  (Supabase Edge Functions in production).
- The app talks only to the `Backend` interface (`src/services/backend/types.ts`). Two
  implementations: `DevBackend` (in-memory, powers local/preview/tests) and the Supabase
  backend (authored under `supabase/`). Selection is via `EXPO_PUBLIC_BACKEND`.
- The `AIProvider` interface (`src/services/ai/types.ts`) abstracts the model. `MockAIProvider`
  is deterministic and used in dev/tests. The real OpenAI provider (Responses API + Structured
  Outputs) lives server-side only. Model routing is config-driven:
  `OPENAI_FAST_MODEL` (gpt-5.6-luna) for cheap/high-volume work, `OPENAI_REASONING_MODEL`
  (gpt-5.6-terra) for nuanced work. Never hard-code model names in business logic.

## Matching

Matching is a **deterministic, testable pipeline** (`src/features/matching/`), not "ask the LLM
if they're compatible". Stages: eligibility → hard boundaries → structured compatibility
(confirmed claims only; **unknown never counts as positive**) → uncertainty/micro-question →
deterministic ranking (never surfaced to users) → LLM explanation-only. The heuristic ranker is
replaceable by a learned model without rewriting product code.

## Safety & GDPR

- Block, report (reporter identity hidden), moderation status, mutual-block enforcement,
  content-moderation hook, human-review status. Safety is not premium.
- 18+ only; DOB private, only age displayed. Verification workflow with a **clearly-marked
  non-production stub** for liveness — do not invent fake security.
- Build for data minimization, explicit consent + withdrawal, export, deletion, correction.
  Deletion must remove/anonymize profile, reflections, claims, photos, push tokens — no orphaned
  AI memory. See `docs/privacy-architecture.md`. Flag where legal review is required.

## Copy & design voice

Calm, premium, private, intelligent, human, intentional. Not casino/gamified/Tinder/HR-quiz.
The matchmaker speaks calmly, directly, humbly, briefly — no therapy language, no fake
enthusiasm, no sparkles everywhere. Avoid Tinder red/pink. Use the design tokens in
`src/design/` — never scatter raw style constants in screens.

## Engineering guardrails

- TypeScript strict. Small modules. No `any` without justification. No giant components.
  Domain logic lives in `src/features/*` / server functions, not in screens.
- After every change: `npm run typecheck`, `npm run lint`, `npm test` must pass.
- Do NOT add: swipe cards, AI avatars, attractiveness scoring, third-party chat import,
  blockchain/Web3, microservices, an agent framework, or fine-tuning. Prefer boring, explicit code.
- The north-star metric is `mutually_desired_second_dates / introductions`. Do not optimize for
  raw engagement time. A good dating product helps users leave.
