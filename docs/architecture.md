# Kindred — Architecture

## Overview

Kindred is a mobile-first app (Expo / React Native / TypeScript) with a Supabase backend and a
**strictly server-side AI boundary**. The app never talks to OpenAI, Supabase admin APIs, or any
vendor directly — it talks to a single `Backend` interface.

```
┌───────────────────────────┐        ┌──────────────────────────────┐
│  Mobile app (Expo/RN)      │        │  Supabase (production)       │
│                            │  JWT   │                              │
│  Expo Router screens       │ ─────► │  Postgres + RLS              │
│  TanStack Query / Zustand  │        │  Auth, Storage (private)     │
│  Design system             │        │  Realtime                    │
│                            │        │  Edge Functions (Deno) ──────┼──► OpenAI
│  Backend interface ────────┼──────► │   (holds all secrets)        │    (Responses API)
│   • DevBackend (local)     │        │                              │
│   • SupabaseBackend        │        └──────────────────────────────┘
│  AIProvider interface      │
│   • MockAIProvider (local) │
└───────────────────────────┘
```

## Mobile architecture

- **Routing:** Expo Router (file-based) under `src/app/`. Route groups: `(auth)`, `onboarding`,
  `(tabs)` (Home / Matchmaker / Chats / Me), plus `introduction/[id]`, `chat/[conversationId]`,
  `reflection/[introductionId]`, and `model` ("What my matchmaker knows"). Screens are thin —
  they render feature components and call hooks; they contain no domain logic.
- **Server state:** TanStack Query. Query keys are namespaced per user. Mutations invalidate the
  relevant caches (e.g. confirming a claim invalidates model insights + introductions).
- **Client state:** Zustand, only for small local/session state (`src/state/session.ts`,
  persisted via AsyncStorage — the session id only, no secrets).
- **Forms:** React Hook Form + Zod.
- **Design system:** `src/design/` — tokens (colours, spacing, radii, typography), a `ThemeProvider`
  with light/dark, and primitives (`Text`, `Button`, `Card`, `Screen`, `Badge`, `Chip`, `Field`,
  `Icon`, `Skeleton`, layout stacks). Screens never hard-code raw style constants.
- **Feature modules:** `src/features/*` hold domain logic and hooks (auth, onboarding, claims,
  matching, introductions, chat, reflections). The matching engine is pure and dependency-free.

## Backend abstraction

`src/services/backend/types.ts` defines a single coarse-grained `Backend` interface — one method
per product operation, so authorization/privacy is enforced in one place.

- **`DevBackend`** (`devBackend.ts`) — an in-memory implementation with seeded fictional users
  (`seed.ts`). It implements the full loop: matching, mutual detection, AI orchestration with
  confirmation gating, realtime message simulation, GDPR export/delete. It powers local dev, the
  web preview, and tests. Peers only ever get `RevealProfile` projections; only confirmed claims
  feed matching.
- **Supabase implementation** — authored under `supabase/` as SQL migrations (schema + RLS),
  Edge Functions (the AI trust boundary and privileged operations), and `seed.sql`. Selected when
  `EXPO_PUBLIC_BACKEND=supabase` and a project is configured.

Because the dev VM has no Docker, the Supabase stack is authored and reviewed here but exercised
on a machine with Docker or a hosted project. This is intentional: a clean interface plus a
realistic dev implementation, never a fake one.

## Matching service

`src/features/matching/` is a pure module:

- `dimensions.ts` — the focused ontology with ordinal scales and explanation phrasing.
- `engine.ts` — `checkEligibility`, `computeCompatibility`, `selectMicroQuestionNeed`,
  `scoreCandidate`, `rankCandidates`.
- `explanation.ts` — deterministic fallback explanation grounded in structured data.
- `config.ts` — configurable weights/thresholds.

It has no React/Supabase/OpenAI dependencies, so it is trivially unit-tested and can be reused by
an Edge Function. A future learned ranker can replace stage 5 behind the same interface.

## AI boundary

See [ai-architecture.md](ai-architecture.md). The app calls `Backend` methods
(`shareThought`, `submitReflection`, `getIntroduction`, …) which, in production, invoke Edge
Functions that call the `AIProvider`. The app depends only on the `AIProvider` **types and Zod
schemas**, plus the deterministic `MockAIProvider`.

## Trust boundary

- Secrets (`OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, vendor keys) exist only in Edge Function
  environments. Only `EXPO_PUBLIC_*` values reach the app bundle (`src/lib/env.ts`).
- Authorization is enforced server-side via RLS + `SECURITY DEFINER` RPCs, never by hiding fields
  in the UI. See [privacy-architecture.md](privacy-architecture.md).

## Data flows (examples)

- **Introduction:** matching runs server-side over sanitized `MatchingProfile`s (confirmed claims
  only) → creates an `introduction` (internal `rank_score`, never sent to clients) → the app reads
  it via a projection that returns a `RevealProfile` + an explanation (per recipient).
- **Reflection → learning:** the app stores the reflection first (never lost) → an Edge Function
  calls `reconcileReflection` → returns hypotheses → the user confirms/corrects → only then is a
  confirmed claim written and a `model_revision` recorded → future matching reflects it.

## Testing

Deterministic unit tests are prioritized: matching (dealbreakers, mutual preference, blocks, age,
rejected pairs, scoring, unknown-not-positive), claims (unconfirmed/rejected excluded, revisions
preserve history), privacy (reveal projection only, participant-only messages), and AI
(schema validation, malformed/hallucinated output rejected, prompt-injection content stays data).
