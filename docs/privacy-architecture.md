# Kindred — Privacy Architecture

> Kindred is an EU-first product. This document describes the privacy mechanisms in the codebase.
> Having these mechanisms does **not** by itself constitute legal compliance. **Professional legal
> review (GDPR, DSA, local dating/consumer law) is required before any real launch.** Points that
> especially need legal review are flagged with **[LEGAL REVIEW]**.

## Core principle

One user's private matchmaker memory must never be accessible to another user or another user's
matchmaker. Privacy is enforced server-side (RLS + `SECURITY DEFINER` RPCs), never by hiding
fields in the UI.

## Data we collect and why

| Data | Why | Stored | Visible to peers? |
| --- | --- | --- | --- |
| Email | Authentication | `auth.users` | No |
| Date of birth | 18+ eligibility | `profiles.date_of_birth` (private) | No — only derived **age** |
| First name | Introductions | `profiles.display_name` | Yes (reveal) |
| Gender | Matching | `profiles.gender` | Only as needed for a mutual intro |
| Partner-gender preference | Matching | `dating_preferences.preferred_genders` | No |
| City / broad area | Distance & context | `profiles.city/area` + coarse coords | Area/city yes; coordinates never |
| Occupation | Optional profile | `profiles.occupation` + `show_occupation` | Only if opted in |
| Bio | Profile | `profiles.bio` | Yes (reveal) |
| Photos | Human evaluation | private Storage bucket | Only via signed URLs in an active intro |
| Claims (preferences) | Matching | `user_claims` | No — only allowed matching facts in explanations |
| Reflections | Learning | `reflection_events` (private) | **Never** |
| Consents | Lawful basis | `sensitive_consents` | No |
| Product events | Analytics | `product_events` (non-sensitive) | No |

Sensitive attributes (orientation labels, religion, politics, ethnicity, health, disability,
fertility, income, trauma, mental health, substance dependency) are **never inferred** and are not
stored for MVP. Only an explicit partner-gender preference is stored, after explicit consent
(`sensitive_consents`). **[LEGAL REVIEW]** partner-gender preference and any special-category data.

## What a peer can see: `RevealProfile`

Peers never read the `profiles` row. The only projection exposed is `RevealProfile`
(`src/types/views.ts`): first name, **age** (never DOB), broad **area/city** (never exact
coordinates), **opt-in** occupation, bio, verified flag, and **signed** photo URLs. In production
this is produced by a `SECURITY DEFINER` RPC (e.g. `get_introduction_profile`) that verifies the
caller participates in an active introduction/match and returns only these fields. `rank_score` and
any private data are never returned to clients.

## Row Level Security (production)

Every table has RLS enabled and denies by default.

- Owner-only (`user_id = auth.uid()`): `dating_preferences`, `user_claims`, `claim_evidence`,
  `model_revisions`, `reflection_events`, `date_outcomes`, `sensitive_consents`, `push_tokens`,
  `ai_usage_log`.
- `profiles`: owner full access; peers get only the reveal projection via RPC.
- `introductions`: participant-only; `rank_score` never exposed to clients.
- `introduction_explanations`: recipient-only (`for_user = auth.uid()`).
- `introduction_decisions`: a user can read/write only their own row — the other side's decision is
  never readable (double-blind).
- `messages`/`conversations`: participant-only; insert requires `sender = auth.uid()` and a
  block check.
- `reports`: reporter can insert/read own; the reported user can never see them.
- Storage: a **private** `user-photos` bucket; owners manage their own folder; peers get access
  only through server-generated **signed URLs** issued by the introduction RPC. No public bucket.

Because the dev VM has no Docker, RLS is authored as SQL and tested on a machine with Docker (or a
hosted project) via the documented harness; the projection/allow-list logic (which fields a peer
may ever see) is additionally covered by unit tests against the dev backend.

## AI exposure

The AI provider receives only sanitized, task-scoped payloads (see
[ai-architecture.md](ai-architecture.md)): allowed confirmed traits, uncertainty, and
explanation-safe facts, using pseudonymous internal ids. Raw reflections and one user's history are
never sent in another user's request. Private reflection text never appears in an explanation —
e.g. a private "I was cheated on" may influence a confirmed `trust importance = high`, and the
explanation only ever says "You both place strong importance on trust." Raw prompts are not logged.

## Consent & withdrawal

`sensitive_consents` records each consent type (`partner_gender_matching`, `photo_processing`,
`ai_processing`), whether granted, timestamps, and a version. Withdrawal is a first-class update
(sets `withdrawn_at`). **[LEGAL REVIEW]** consent wording, granularity, and withdrawal effects.

## Data export

`Backend.exportData(userId)` returns a structured copy of the user's profile, preferences,
consents, claims, reflections, photos (ids/positions), date outcomes, introductions (without
`rank_score`), and own messages. The production implementation is `export_own_data()`.
**[LEGAL REVIEW]** completeness/format for a GDPR Art. 15/20 request.

## Account deletion

`Backend.deleteAccount(userId)` removes/anonymizes the profile, preferences, consents, photos,
claims, revisions, reflections, date outcomes, and push tokens, and clears the session. No orphaned
AI memory or embeddings remain. Reports are retained in anonymized form (reporter identity and
notes stripped; foreign keys set null). Messages sent by the deleted user cascade-delete with the
profile. **[LEGAL REVIEW]** retention period for anonymized safety records, and whether a remaining
chat participant should keep a copy of the deleted user's messages.

## Location privacy

Exact real-time location is never tracked or stored. Only city, broad area, and an approximate
radius preference are used; coordinates are coarsened (`coarsenCoordinate`) and never exposed to
peers. Distance is computed server-side.

## Notifications

Push notification text must not contain sensitive compatibility details. "You have a new
introduction." — not "We found someone who matches your views on marriage and children."

## Verification

The selfie/liveness verification is a **clearly-marked development stub** (`getVerification`
returns `usingStub: true`, and the UI labels it as non-production). Do not present it as real
identity assurance. A production liveness vendor must be integrated behind the same interface.
