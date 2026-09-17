-- Kindred — identity: profiles, preferences, consents, photos, verification.
-- Private-by-default. Peers never read these rows directly; they receive only a
-- reveal-safe projection via a SECURITY DEFINER RPC (added with introductions).

-- --------------------------------------------------------------------------
-- profiles (1:1 with auth.users). DOB is private; only age is ever derived.
-- --------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 60),
  date_of_birth date not null,
  gender gender not null,
  city text not null default 'Munich',
  area text not null,
  -- Coarse coordinates only (rounded upstream). Never exposed to peers.
  approx_lat double precision not null,
  approx_lng double precision not null,
  occupation text check (occupation is null or char_length(occupation) <= 80),
  show_occupation boolean not null default true,
  bio text not null default '' check (char_length(bio) <= 500),
  smokes smoking_habit not null default 'no',
  moderation_status moderation_status not null default 'active',
  verification_status verification_status not null default 'unverified',
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Enforce 18+ at the database level.
  constraint profiles_adult check (date_of_birth <= (current_date - interval '18 years'))
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select to authenticated using (id = auth.uid());
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check (id = auth.uid());
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- --------------------------------------------------------------------------
-- dating_preferences (hard filters + explicit dealbreakers)
-- --------------------------------------------------------------------------
create table public.dating_preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  preferred_genders gender[] not null,
  min_age int not null check (min_age >= 18),
  max_age int not null check (max_age >= min_age),
  max_distance_km int not null check (max_distance_km > 0),
  relationship_goal relationship_goal not null,
  smoking_dealbreaker boolean not null default false,
  children_intent children_intent not null default 'unsure',
  children_dealbreaker boolean not null default false,
  updated_at timestamptz not null default now()
);

create trigger dating_preferences_set_updated_at
  before update on public.dating_preferences
  for each row execute function public.set_updated_at();

alter table public.dating_preferences enable row level security;

create policy "preferences_rw_own" on public.dating_preferences
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- --------------------------------------------------------------------------
-- sensitive_consents (explicit consent + withdrawal; GDPR)
-- --------------------------------------------------------------------------
create table public.sensitive_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  consent_type consent_type not null,
  granted boolean not null,
  granted_at timestamptz,
  withdrawn_at timestamptz,
  version text not null default '1.0',
  unique (user_id, consent_type)
);

alter table public.sensitive_consents enable row level security;

create policy "consents_rw_own" on public.sensitive_consents
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- --------------------------------------------------------------------------
-- profile_photos (private storage paths; peers get signed URLs via RPC)
-- --------------------------------------------------------------------------
create table public.profile_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  storage_path text not null,
  position int not null default 0,
  is_primary boolean not null default false,
  moderation_status moderation_status not null default 'active',
  created_at timestamptz not null default now()
);
create index profile_photos_user_idx on public.profile_photos (user_id, position);

alter table public.profile_photos enable row level security;

create policy "photos_rw_own" on public.profile_photos
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- --------------------------------------------------------------------------
-- verification_requests (selfie workflow; liveness is a stub in MVP)
-- --------------------------------------------------------------------------
create table public.verification_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null default 'selfie',
  status verification_status not null default 'selfie_pending',
  provider text not null default 'stub',
  evidence_path text,
  reviewed_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create index verification_requests_user_idx on public.verification_requests (user_id);

alter table public.verification_requests enable row level security;

create policy "verification_select_own" on public.verification_requests
  for select to authenticated using (user_id = auth.uid());
create policy "verification_insert_own" on public.verification_requests
  for insert to authenticated with check (user_id = auth.uid());
-- Review/update is performed by the service role / admin tooling only.

-- --------------------------------------------------------------------------
-- Private photo storage bucket + owner-only object policies
-- --------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('user-photos', 'user-photos', false)
on conflict (id) do nothing;

create policy "user_photos_owner_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'user-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "user_photos_owner_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'user-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "user_photos_owner_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'user-photos' and (storage.foldername(name))[1] = auth.uid()::text);
