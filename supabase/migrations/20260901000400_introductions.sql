-- Kindred — introductions, explanations, decisions, matches + reveal/concierge RPCs.
-- rank_score is INTERNAL and hidden from clients via column privileges. Decisions
-- are double-blind (a user can never read the other side's decision).

-- --------------------------------------------------------------------------
-- introductions
-- --------------------------------------------------------------------------
create table public.introductions (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles (id) on delete cascade,
  user_b uuid not null references public.profiles (id) on delete cascade,
  status introduction_status not null default 'active',
  created_by uuid references auth.users (id),
  rank_score numeric not null default 0, -- INTERNAL: never exposed to clients
  algo_version text not null default 'heuristic-v1',
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  constraint introductions_distinct check (user_a <> user_b)
);
-- One introduction per pair, ever (canonical ordering).
create unique index introductions_pair_unique
  on public.introductions (least(user_a, user_b), greatest(user_a, user_b));
create index introductions_user_a_idx on public.introductions (user_a, status);
create index introductions_user_b_idx on public.introductions (user_b, status);

alter table public.introductions enable row level security;
create policy "introductions_select_participant" on public.introductions
  for select to authenticated using (user_a = auth.uid() or user_b = auth.uid());

-- Hide the internal rank_score at the column-privilege level (RLS is row-level).
revoke select on public.introductions from anon, authenticated;
grant select (id, user_a, user_b, status, algo_version, created_at, expires_at)
  on public.introductions to authenticated;

-- --------------------------------------------------------------------------
-- introduction_explanations (per-recipient; recipient-only)
-- --------------------------------------------------------------------------
create table public.introduction_explanations (
  id uuid primary key default gen_random_uuid(),
  introduction_id uuid not null references public.introductions (id) on delete cascade,
  for_user uuid not null references public.profiles (id) on delete cascade,
  alignment jsonb not null default '[]'::jsonb,
  friction jsonb not null default '[]'::jsonb,
  unknowns jsonb not null default '[]'::jsonb,
  generated_by text not null default 'fallback',
  created_at timestamptz not null default now(),
  unique (introduction_id, for_user)
);
alter table public.introduction_explanations enable row level security;
create policy "explanations_select_recipient" on public.introduction_explanations
  for select to authenticated using (for_user = auth.uid());

-- --------------------------------------------------------------------------
-- introduction_decisions (double-blind: only your own row is ever visible)
-- --------------------------------------------------------------------------
create table public.introduction_decisions (
  introduction_id uuid not null references public.introductions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  decision decision not null,
  decided_at timestamptz not null default now(),
  primary key (introduction_id, user_id)
);
alter table public.introduction_decisions enable row level security;
create policy "decisions_rw_own" on public.introduction_decisions
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- --------------------------------------------------------------------------
-- matches (created server-side only, when both decisions are 'interested')
-- --------------------------------------------------------------------------
create table public.matches (
  id uuid primary key default gen_random_uuid(),
  introduction_id uuid not null unique references public.introductions (id) on delete cascade,
  user_a uuid not null references public.profiles (id) on delete cascade,
  user_b uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  closed_at timestamptz
);
alter table public.matches enable row level security;
create policy "matches_select_participant" on public.matches
  for select to authenticated using (user_a = auth.uid() or user_b = auth.uid());

-- --------------------------------------------------------------------------
-- get_introduction_profile: the ONLY reveal-safe projection of the other user.
-- No DOB (age only), no coordinates, no rank_score. Photo signing is done by an
-- Edge Function with the service role (peers cannot read each other's storage).
-- --------------------------------------------------------------------------
create or replace function public.get_introduction_profile(p_introduction_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_intro public.introductions%rowtype;
  v_other uuid;
  v_p public.profiles%rowtype;
  v_photos jsonb;
begin
  select * into v_intro from public.introductions where id = p_introduction_id;
  if not found then
    raise exception 'introduction not found';
  end if;
  if auth.uid() is null or (auth.uid() <> v_intro.user_a and auth.uid() <> v_intro.user_b) then
    raise exception 'forbidden';
  end if;

  v_other := case when v_intro.user_a = auth.uid() then v_intro.user_b else v_intro.user_a end;
  select * into v_p from public.profiles where id = v_other;

  select coalesce(
    jsonb_agg(jsonb_build_object('id', id, 'path', storage_path) order by position),
    '[]'::jsonb
  ) into v_photos
  from public.profile_photos
  where user_id = v_other and moderation_status = 'active';

  return jsonb_build_object(
    'userId', v_other,
    'firstName', v_p.display_name,
    'age', extract(year from age(v_p.date_of_birth))::int,
    'city', v_p.city,
    'area', v_p.area,
    'occupation', case when v_p.show_occupation then v_p.occupation else null end,
    'bio', v_p.bio,
    'verified', v_p.verification_status = 'selfie_verified',
    'photos', v_photos
  );
end;
$$;
grant execute on function public.get_introduction_profile(uuid) to authenticated;

-- --------------------------------------------------------------------------
-- create_introduction: concierge / operator manual introduction.
-- SECURITY DEFINER; restricted to the service role (operator via Supabase Studio).
-- --------------------------------------------------------------------------
create or replace function public.create_introduction(p_user_a uuid, p_user_b uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.introductions (user_a, user_b, status, created_by, rank_score, algo_version)
  values (p_user_a, p_user_b, 'active', auth.uid(), 0, 'manual')
  returning id into v_id;
  return v_id;
end;
$$;
-- Operators call this with the service role; regular users cannot.
revoke execute on function public.create_introduction(uuid, uuid) from public, anon, authenticated;
