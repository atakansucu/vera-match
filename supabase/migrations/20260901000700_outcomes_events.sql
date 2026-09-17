-- Kindred — date outcomes + product analytics events.
-- Second-date intent is PRIVATE per user; mutual second-date interest is derived
-- server-side only (the north-star metric building block).

-- --------------------------------------------------------------------------
-- date_outcomes (private per user)
-- --------------------------------------------------------------------------
create table public.date_outcomes (
  id uuid primary key default gen_random_uuid(),
  introduction_id uuid not null references public.introductions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  outcome date_outcome not null,
  second_date_intent second_date_intent not null default 'prefer_not_say',
  created_at timestamptz not null default now(),
  unique (introduction_id, user_id)
);
alter table public.date_outcomes enable row level security;
create policy "date_outcomes_rw_own" on public.date_outcomes
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- --------------------------------------------------------------------------
-- product_events (internal analytics; non-sensitive props only)
-- --------------------------------------------------------------------------
create table public.product_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  event_type text not null,
  props jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index product_events_type_idx on public.product_events (event_type, created_at);
alter table public.product_events enable row level security;
-- Users may record their own events; nobody reads them (analytics via service role).
create policy "product_events_insert_own" on public.product_events
  for insert to authenticated with check (user_id = auth.uid() or user_id is null);

-- --------------------------------------------------------------------------
-- Internal analytics helper: the north-star numerator.
-- mutually_desired_second_dates / introductions is computed from these.
-- Not granted to app users — service role only.
-- --------------------------------------------------------------------------
create or replace view public.internal_mutual_second_dates as
select i.id as introduction_id
from public.introductions i
where (
  select count(*) from public.date_outcomes d
  where d.introduction_id = i.id and d.second_date_intent = 'want_again'
) = 2;

revoke all on public.internal_mutual_second_dates from anon, authenticated;
