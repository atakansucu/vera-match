# Kindred

A private AI matchmaker that gradually learns who you actually connect with, improves from
real dating outcomes, and introduces you to **fewer people, for reasons it can explain.**

Kindred is not a swipe app and not "a dating app with a chatbot bolted on". There is no
infinite feed, no compatibility percentages, and no popularity metrics. You receive a small
number of curated introductions with a clear, evidence-backed explanation, you see photos
before you decide, and — only when both people independently say yes — a human conversation
opens. After a date, a short private reflection lets the matchmaker propose what it learned,
which **you confirm or correct** before it ever affects future introductions.

This repo is a cross-platform mobile app (Expo / React Native / TypeScript) with a Supabase
backend and a strictly server-side AI boundary.

> Status: MVP in active development. See [docs/implementation-plan.md](docs/implementation-plan.md).

## Highlights

- **Evidence-backed model, not a persona blob.** Everything the matchmaker believes is a
  `Claim` with a type (stated / observed / hypothesis), a status (unconfirmed / confirmed /
  rejected / superseded), a deterministic confidence tier, and immutable evidence.
- **You are the authority.** Inferred claims are `unconfirmed` and never influence matching
  until you confirm them. Review and correct everything in "What my matchmaker knows".
- **Deterministic matching pipeline** (eligibility → hard boundaries → structured compatibility
  → uncertainty → ranking → explanation). The LLM only phrases approved structured evidence.
- **Privacy first.** Peers only ever see a minimal reveal profile. Private reflections never
  leak into explanations. Secrets never live in the app.

## Prerequisites

- Node.js 20+ (this repo is developed on Node 22)
- npm 10+
- For device testing: the **Expo Go** app, or an iOS Simulator (macOS) / Android emulator
- Optional (for the real backend): Docker + the Supabase CLI

## Setup

```bash
npm install
cp .env.example .env   # optional; sensible dev defaults are baked in
```

The app runs out of the box against an in-memory **dev backend** with seeded fictional users
and a deterministic **mock AI provider**, so the full product loop is testable without any
external services or API keys.

## Running the app

```bash
npm run web        # open in a browser (fastest for a quick look)
npm run ios        # iOS simulator (macOS)
npm run android    # Android emulator / device
npm start          # Expo dev server + QR code for Expo Go
```

### Try the full loop in the preview

On the sign-in screen, tap **"Continue as demo (Ava)"**. Ava is a seeded, onboarded user with:

- a pending introduction (open it → read the explanation → see photos → choose Interested),
- an existing mutual match and chat (David),
- a past date to reflect on (from the introduction, submit a reflection and confirm the insight).

New email sign-ups use the code `000000` in dev mode and go through onboarding.

## Environment variables

Only `EXPO_PUBLIC_*` values reach the app bundle. **Secrets never go here.**

| Variable | Purpose | Default |
| --- | --- | --- |
| `EXPO_PUBLIC_BACKEND` | `dev` (in-memory) or `supabase` | `dev` |
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL | — |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon (publishable) key | — |
| `EXPO_PUBLIC_BETA_ALLOWED_EMAIL_DOMAINS` | Comma-separated community email allow-list (empty = allow all) | empty |

Server-only secrets (used by Supabase Edge Functions, never by the app):
`OPENAI_API_KEY`, `OPENAI_FAST_MODEL` (default `gpt-5.6-luna`),
`OPENAI_REASONING_MODEL` (default `gpt-5.6-terra`), `SUPABASE_SERVICE_ROLE_KEY`.

## Supabase (production backend)

The canonical server lives under [`supabase/`](supabase/): SQL migrations (schema + Row Level
Security), Edge Functions (the AI trust boundary), and `seed.sql`. Running it locally needs
Docker:

```bash
supabase start
supabase db reset   # applies migrations + seed
```

See [docs/architecture.md](docs/architecture.md) and [docs/privacy-architecture.md](docs/privacy-architecture.md).

## Scripts

```bash
npm run typecheck   # tsc --noEmit (strict)
npm run lint        # eslint
npm test            # jest (business-logic + privacy + AI schema tests)
npm run format      # prettier --write
```

## Project structure

```text
src/
  app/            # Expo Router routes (thin screens only)
  components/     # shared cross-feature components
  design/         # design tokens, theme, primitives
  features/       # domain logic: auth, onboarding, claims, matching, introductions, chat, reflections
  hooks/          # app-level hooks
  lib/            # env, geo, date, feature flags, logging
  services/
    backend/      # Backend interface + DevBackend (+ Supabase impl)
    ai/           # AIProvider interface + Zod schemas + MockAIProvider
  state/          # zustand stores
  types/          # domain + view types
supabase/         # migrations, edge functions, seed
docs/             # implementation-plan, architecture, ai-architecture, privacy-architecture
```

## License

MIT — see [LICENSE](LICENSE).
