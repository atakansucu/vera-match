-- Kindred — Engagement v2: micro-scenarios, prediction game, new feature flags.

-- --------------------------------------------------------------------------
-- New feature flags
-- --------------------------------------------------------------------------
insert into public.app_config (key, value) values
  ('match_drop_enabled',           'true'::jsonb),
  ('micro_scenarios_enabled',      'true'::jsonb),
  ('prediction_game_enabled',      'true'::jsonb),
  ('weekly_recap_enabled',         'true'::jsonb),
  ('conversation_starter_enabled', 'true'::jsonb)
on conflict (key) do nothing;

-- --------------------------------------------------------------------------
-- micro_scenarios (scenario-based questions, owner-only)
-- --------------------------------------------------------------------------
create table public.micro_scenarios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  target_dimension text not null,
  scenario_type text not null,
  prompt text not null,
  options jsonb not null default '[]'::jsonb,
  reason text not null default '',
  candidate_id uuid references public.profiles (id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending', 'answered', 'skipped', 'expired')),
  created_at timestamptz not null default now(),
  answered_at timestamptz
);
create index micro_scenarios_user_idx on public.micro_scenarios (user_id, status);

alter table public.micro_scenarios enable row level security;
create policy "micro_scenarios_rw_own" on public.micro_scenarios
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- --------------------------------------------------------------------------
-- prediction_events ("Would I get you right?" — owner-only)
-- --------------------------------------------------------------------------
create table public.prediction_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  prediction_type text not null default 'candidate_preference',
  candidate_a_payload jsonb not null,
  candidate_b_payload jsonb not null,
  predicted_choice text not null check (predicted_choice in ('a', 'b')),
  actual_choice text check (actual_choice in ('a', 'b')),
  correct boolean,
  model_version text not null default 'heuristic-v1',
  reason text,
  created_at timestamptz not null default now()
);
create index prediction_events_user_idx on public.prediction_events (user_id, created_at);

alter table public.prediction_events enable row level security;
create policy "prediction_events_rw_own" on public.prediction_events
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
