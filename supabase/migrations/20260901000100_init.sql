-- Kindred — initial migration: extensions, enums, shared helpers, app_config.
-- Every table created in later migrations enables RLS and denies by default.

create extension if not exists pgcrypto;

-- --------------------------------------------------------------------------
-- Enums (mirror src/types/domain.ts)
-- --------------------------------------------------------------------------
create type gender as enum ('woman', 'man', 'nonbinary');
create type relationship_goal as enum ('life_partner', 'long_term', 'short_term', 'unsure');
create type verification_status as enum (
  'unverified', 'email_verified', 'selfie_pending', 'selfie_verified', 'rejected'
);
create type moderation_status as enum ('active', 'flagged', 'suspended', 'banned');
create type smoking_habit as enum ('no', 'sometimes', 'yes');
create type children_intent as enum ('want', 'dont_want', 'open', 'unsure');
create type consent_type as enum ('partner_gender_matching', 'photo_processing', 'ai_processing');

create type claim_type as enum ('stated', 'observed', 'hypothesis');
create type claim_status as enum ('unconfirmed', 'confirmed', 'rejected', 'superseded');
create type confidence_tier as enum (
  'explicit_high', 'confirmed_medium_high', 'weak_low', 'unknown'
);
create type evidence_type as enum (
  'onboarding_answer', 'micro_question_answer', 'reflection',
  'decision_behavior', 'profile_text', 'direct_edit'
);
create type reliability as enum ('high', 'medium', 'low');

create type introduction_status as enum ('active', 'matched', 'closed', 'expired');
create type decision as enum ('interested', 'not_for_me');

create type report_category as enum (
  'harassment', 'hate_abuse', 'fake_identity', 'scam',
  'inappropriate_sexual', 'threat_safety', 'underage', 'other'
);
create type report_status as enum ('open', 'reviewing', 'actioned', 'dismissed');

create type date_outcome as enum ('met', 'did_not_meet', 'prefer_not_say');
create type second_date_intent as enum ('want_again', 'no_continue', 'prefer_not_say');

create type ai_task_type as enum (
  'extract_claims', 'reconcile_reflection', 'generate_explanation',
  'propose_micro_question', 'summarize_model'
);

-- --------------------------------------------------------------------------
-- Shared helper: keep updated_at fresh
-- --------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- --------------------------------------------------------------------------
-- Server-controlled feature flags / config
-- --------------------------------------------------------------------------
create table public.app_config (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

insert into public.app_config (key, value) values
  ('weekly_introduction_limit', '2'::jsonb),
  ('micro_question_enabled', 'true'::jsonb),
  ('post_date_reflection_enabled', 'true'::jsonb),
  ('friction_visible', 'true'::jsonb),
  ('beta_allowed_email_domains', '[]'::jsonb);

alter table public.app_config enable row level security;

-- Config is readable by any authenticated user; only the service role writes it.
create policy "app_config_read" on public.app_config
  for select to authenticated using (true);
