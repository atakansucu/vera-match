# RLS inventory (Phase 8 review)

Every table has RLS enabled and denies by default. This is a review checklist, not a legal opinion.

| Table | Who can read | Who can write | Notes |
| --- | --- | --- | --- |
| `app_config` | authenticated (select) | service role | Feature flags |
| `profiles` | owner | owner insert/update | Peers use `get_introduction_profile` |
| `dating_preferences` | owner | owner | Never peer-visible |
| `sensitive_consents` | owner | owner | Consent + withdrawal |
| `profile_photos` | owner | owner | Peers get signed URLs via RPC |
| `verification_requests` | owner select/insert | owner insert | Review by service role |
| `user_claims` | owner | owner | Confirmed-only matching happens server-side |
| `claim_evidence` | owner via claim | owner insert | No update/delete — immutable |
| `model_revisions` | owner | owner insert | Audit trail |
| `reflection_events` | owner | owner | NEVER in explanations |
| `ai_usage_log` | none (service role) | service role | No raw prompts |
| `introductions` | participants; `rank_score` column revoked | service role / concierge | Score never client-visible |
| `introduction_explanations` | recipient (`for_user`) | service role | Per-recipient |
| `introduction_decisions` | own row only | own row | Double-blind |
| `matches` | participants | `submit_decision` definer | |
| `conversations` | participants | `submit_decision` definer | |
| `messages` | participants | participant insert, block-aware | |
| `blocks` | blocker | blocker | Applied in matching + messaging |
| `reports` | reporter only | reporter insert | Reported user has no visibility |
| `date_outcomes` | owner | owner | Mutual 2nd-date derived internally |
| `product_events` | none | own insert | Analytics via service role |
| `push_tokens` | owner | owner | Wiped on deletion |
| `storage.objects` (user-photos) | owner folder | owner folder | Private bucket |

RPCs:

- `get_introduction_profile(uuid)` — SECURITY DEFINER, participant check, reveal-safe fields only.
- `create_introduction(uuid, uuid)` — service role only (concierge).
- `submit_decision(uuid, decision)` — SECURITY DEFINER, double-blind mutual detection.
- `delete_own_account()` — SECURITY DEFINER, caller only.

**Still required before launch:** pgTAP / integration tests against a live Postgres with two JWTs (this VM has no Docker). Projection allow-lists are covered by unit tests against `DevBackend`.
