# Supabase (production backend)

This directory is the **canonical production server** for Kindred:

```
supabase/
  config.toml        # local stack config
  migrations/        # SQL schema + Row Level Security (applied in order)
  functions/         # Edge Functions (Deno) — the AI trust boundary + privileged ops
  seed.sql           # local seed data (fictional users)
```

## Why the app still runs without this

The mobile app talks only to the `Backend` interface (`src/services/backend/`). During local
development and in the web preview it uses `DevBackend` (in-memory + seed) and `MockAIProvider`,
so the full product loop works with **no Docker and no API keys**. This Supabase project is the
real backend that the same interface targets in production (`EXPO_PUBLIC_BACKEND=supabase`).

## Running locally (requires Docker)

```bash
supabase start          # boots Postgres, Auth, Storage, Realtime, Edge Runtime
supabase db reset       # applies migrations/ then seed.sql
supabase functions serve
```

Set Edge Function secrets (never in the app bundle):

```bash
supabase secrets set OPENAI_API_KEY=... \
  OPENAI_FAST_MODEL=gpt-5.6-luna \
  OPENAI_REASONING_MODEL=gpt-5.6-terra
```

## Security posture

- Every table has RLS enabled and denies by default. See `migrations/` and
  [../docs/privacy-architecture.md](../docs/privacy-architecture.md).
- Peers never read another user's `profiles` row — a `SECURITY DEFINER` RPC returns only the
  reveal-safe projection with signed photo URLs.
- Secrets live only in Edge Function environments. The app holds none.

## Testing RLS

RLS policies are verified on a machine with Docker (or a hosted project) using pgTAP / a Node
integration harness. The field-level allow-lists (what a peer may ever see) are additionally
covered by unit tests against the dev backend so regressions are caught in CI without Docker.
