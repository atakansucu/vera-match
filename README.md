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
- For device testing: **SDK 57 Expo Go** ([sign.expo.dev](https://sign.expo.dev) on iPhone, [expo.dev/go](https://expo.dev/go) on Android — App Store Expo Go is SDK 54 and will not open this project), or an iOS Simulator (macOS) / Android emulator
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
npm run web           # open in a browser (fastest for a quick look)
npm run ios           # iOS simulator (macOS)
npm run android       # Android emulator / device
npm start             # Expo dev server + QR code for Expo Go (LAN)
npm run start:tunnel  # same, via an ngrok tunnel (phone not on the same Wi‑Fi)
```

### Expo Go timeout (“Opening project…” then fails)

Kindred targets **Expo SDK 57**. Store Expo Go on iPhone is still built for **SDK 54**, so scanning a QR from this project will hang on “Opening project…” and time out. That is not a Kindred bug.

Do this on **your machine**, not a Cloud Agent QR (`127.0.0.1` / a remote agent host is unreachable from your phone):

1. **Install an SDK 57 Expo Go**, not the App Store copy:
   - iPhone: [https://sign.expo.dev](https://sign.expo.dev)
   - Android: [https://expo.dev/go](https://expo.dev/go)
2. **Log in to the same Expo account on both sides.** SDK 57 Expo Go requires it ([changelog](https://expo.dev/changelog/expo-go-57-login)):
   ```bash
   npx expo login
   ```
   Then open Expo Go → Profile and sign in with the same account.
3. **Network:**
   - Same Wi‑Fi as the laptop: `npm start`, scan the QR.
   - Different network / guest Wi‑Fi / cellular: `npm run start:tunnel`, wait until the tunnel URL is ready, then scan that QR. Tunnel is required whenever the phone cannot reach the laptop’s LAN IP.
4. **Do not scan a Cloud Agent QR.** Those advertise `localhost` or an internal host. Clone the repo locally (or use EAS / a simulator) instead.
5. **If it still fails after a matching Expo Go + login:** this app uses `expo-glass-effect` and `@expo/ui`, which can be unreliable in Expo Go. Use an iOS Simulator (`npm run ios` on macOS), Android emulator, or a development build.

We are **not** downgrading the whole project to SDK 54 just to match App Store Expo Go.

### Try the full loop in the preview

On the sign-in screen, tap **"Continue as demo (Ava)"**. Ava is a seeded, onboarded user in Munich
with 11 other fictional community members (Liam, David, Noah, Mateo, Jonas, Emil, Ben, Sophia,
Elif, Maya, …). Nobody is a real person.

Walk the core loop:

1. **Home** — a pending introduction to Liam. Open it. Read *Why this person?* first
   (alignment / friction / unknown). Then continue to photos. Choose **I'd like to meet them**.
   Liam independently says yes → **It's mutual.** → chat opens.
2. **Chats** — an existing conversation with David. Send a message. Tap the flag to report/block.
   Tap *Been on a date?* to open the reflection flow.
3. **Matchmaker** — share a thought like *"the whole date was about work and planning felt off"*.
   An unconfirmed hypothesis appears. Confirm it, then open **What my matchmaker knows**.
4. **Me** — profile, verification stub (labelled non-production), notifications, export, delete.

New email sign-ups use the code `000000` in dev mode and go through the ~5-minute onboarding.
Jonas smokes — Ava's smoking dealbreaker excludes him. Introductions are never invented.

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
npm run typecheck     # tsc --noEmit (strict)
npm run lint          # eslint
npm test              # jest (business-logic + privacy + AI schema tests)
npm run format        # prettier --write
npm run start:tunnel  # Expo Go over ngrok when the phone is not on LAN
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
docs/             # implementation-plan, architecture, ai-architecture, privacy-architecture,
                  # operations-concierge-matching, rls-inventory
```

## License

MIT — see [LICENSE](LICENSE).
