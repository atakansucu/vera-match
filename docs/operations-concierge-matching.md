# Operations — Concierge (manual) matchmaking

The first closed beta needs operator assistance. Kindred supports manually creating an
introduction between two eligible users **without** a large admin dashboard — a secure server
function plus a Supabase Studio workflow is enough.

## Prerequisites

- Access to the project's Supabase Studio (SQL editor) with the **service role**.
- The two users must be onboarded, verified as required, and mutually eligible. Always sanity-check
  eligibility (mutual gender preference, age ranges, distance, not blocked, not already introduced,
  relationship-goal compatibility) before creating an introduction.

## Create an introduction

In the Supabase SQL editor (service role):

```sql
-- Look up candidate user ids (do not expose these in the app).
select id, display_name, area, gender from public.profiles order by created_at desc;

-- Create the introduction (canonical pair uniqueness prevents duplicates).
select public.create_introduction(
  '00000000-0000-0000-0000-0000000000aa',  -- user A
  '00000000-0000-0000-0000-0000000000bb'   -- user B
);
```

`create_introduction` is `SECURITY DEFINER` and execute is **revoked from anon/authenticated**, so
only the service role (operator) can call it. It records `algo_version = 'manual'` and
`created_by = auth.uid()`.

## Generate the explanation

An introduction can exist without an AI explanation — the app always renders a deterministic
fallback from structured compatibility (`buildFallbackExplanation`). To pre-generate a richer
explanation, call the matching/explanation path server-side (Edge Function
`ai-generate-explanation`) with the sanitized compatibility facts and insert the result into
`introduction_explanations` (one row per recipient). Never place private text in an explanation.

## What the users see

Neither user ever sees `rank_score` (hidden via column privileges) or the other's decision
(double-blind: `introduction_decisions` RLS only exposes your own row). When both independently
choose `interested`, the server creates the `match` + `conversation` and both see "It's mutual."

## Closing / safety

To withdraw an introduction:

```sql
update public.introductions set status = 'closed' where id = '...';
```

Blocks and reports are enforced by RLS + the matching eligibility filter, so a manually created
introduction still respects safety state. Do not bypass blocks when matching manually.
