-- Kindred — relationship model: claims, evidence (immutable), revisions, reflections.
-- All owner-only. Only CONFIRMED claims ever influence matching (enforced in app
-- + server logic). Evidence and reflections are never exposed to peers.

-- --------------------------------------------------------------------------
-- user_claims
-- --------------------------------------------------------------------------
create table public.user_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  dimension text not null,
  value text not null,
  claim_type claim_type not null,
  confidence confidence_tier not null,
  importance smallint not null default 3 check (importance between 1 and 5),
  status claim_status not null default 'unconfirmed',
  source_type evidence_type not null,
  superseded_by uuid references public.user_claims (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index user_claims_user_status_idx on public.user_claims (user_id, status, dimension);

create trigger user_claims_set_updated_at
  before update on public.user_claims
  for each row execute function public.set_updated_at();

alter table public.user_claims enable row level security;
create policy "claims_rw_own" on public.user_claims
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- --------------------------------------------------------------------------
-- claim_evidence (immutable: insert + select only, no update/delete policy)
-- --------------------------------------------------------------------------
create table public.claim_evidence (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.user_claims (id) on delete cascade,
  event_type text not null,
  event_id uuid,
  evidence_type evidence_type not null,
  reliability reliability not null,
  created_at timestamptz not null default now()
);
create index claim_evidence_claim_idx on public.claim_evidence (claim_id);

alter table public.claim_evidence enable row level security;
create policy "evidence_select_own" on public.claim_evidence
  for select to authenticated using (
    exists (
      select 1 from public.user_claims c
      where c.id = claim_evidence.claim_id and c.user_id = auth.uid()
    )
  );
create policy "evidence_insert_own" on public.claim_evidence
  for insert to authenticated with check (
    exists (
      select 1 from public.user_claims c
      where c.id = claim_evidence.claim_id and c.user_id = auth.uid()
    )
  );
-- No update/delete policies => evidence history is immutable for users.

-- --------------------------------------------------------------------------
-- model_revisions (auditable trail)
-- --------------------------------------------------------------------------
create table public.model_revisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  claim_id uuid references public.user_claims (id) on delete set null,
  dimension text not null,
  previous_value text,
  new_value text,
  source evidence_type not null,
  confirmed boolean not null,
  reflection_event_id uuid,
  created_at timestamptz not null default now()
);
create index model_revisions_user_idx on public.model_revisions (user_id, created_at);

alter table public.model_revisions enable row level security;
create policy "revisions_select_own" on public.model_revisions
  for select to authenticated using (user_id = auth.uid());
create policy "revisions_insert_own" on public.model_revisions
  for insert to authenticated with check (user_id = auth.uid());

-- --------------------------------------------------------------------------
-- reflection_events (PRIVATE raw text; never exposed to peers or in explanations)
-- --------------------------------------------------------------------------
create table public.reflection_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  introduction_id uuid,
  raw_text text not null,
  ai_processed boolean not null default false,
  created_at timestamptz not null default now()
);
create index reflection_events_user_idx on public.reflection_events (user_id, created_at);

alter table public.reflection_events enable row level security;
create policy "reflections_rw_own" on public.reflection_events
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
