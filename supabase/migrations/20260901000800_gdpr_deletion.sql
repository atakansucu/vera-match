-- Kindred — account deletion (GDPR Art. 17), structured export (Art. 15/20),
-- and consent-adjacent helpers. Safety records (reports) are retained in
-- anonymized form for legitimate-interest/safety reasons
-- (LEGAL REVIEW required before launch — see docs/privacy-architecture.md).

-- --------------------------------------------------------------------------
-- push_tokens (owner-only; wiped on deletion)
-- --------------------------------------------------------------------------
create table if not exists public.push_tokens (
  token text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  platform text not null default 'unknown',
  created_at timestamptz not null default now()
);
alter table public.push_tokens enable row level security;
create policy "push_tokens_rw_own" on public.push_tokens
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- --------------------------------------------------------------------------
-- Reports survive account deletion in anonymized form (SET NULL, not CASCADE).
-- --------------------------------------------------------------------------
alter table public.reports
  alter column reporter_id drop not null,
  alter column reported_user_id drop not null;

alter table public.reports
  drop constraint reports_reporter_id_fkey,
  drop constraint reports_reported_user_id_fkey;

alter table public.reports
  add constraint reports_reporter_id_fkey
    foreign key (reporter_id) references public.profiles (id) on delete set null,
  add constraint reports_reported_user_id_fkey
    foreign key (reported_user_id) references public.profiles (id) on delete set null;

-- --------------------------------------------------------------------------
-- export_own_data: structured copy of the caller's rows. Never includes
-- rank_score, another user's private memory, or AI prompts.
-- --------------------------------------------------------------------------
create or replace function public.export_own_data()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  return jsonb_build_object(
    'exportedAt', now(),
    'profile', (select to_jsonb(p) from public.profiles p where p.id = uid),
    'preferences', (select to_jsonb(d) from public.dating_preferences d where d.user_id = uid),
    'consents', coalesce(
      (select jsonb_agg(to_jsonb(c)) from public.sensitive_consents c where c.user_id = uid),
      '[]'::jsonb
    ),
    'claims', coalesce(
      (select jsonb_agg(to_jsonb(cl)) from public.user_claims cl where cl.user_id = uid),
      '[]'::jsonb
    ),
    'reflections', coalesce(
      (select jsonb_agg(to_jsonb(r)) from public.reflection_events r where r.user_id = uid),
      '[]'::jsonb
    ),
    'photos', coalesce(
      (
        select jsonb_agg(jsonb_build_object(
          'id', ph.id,
          'position', ph.position,
          'isPrimary', ph.is_primary
        ))
        from public.profile_photos ph
        where ph.user_id = uid
      ),
      '[]'::jsonb
    ),
    'dateOutcomes', coalesce(
      (select jsonb_agg(to_jsonb(o)) from public.date_outcomes o where o.user_id = uid),
      '[]'::jsonb
    ),
    'introductions', coalesce(
      (
        select jsonb_agg(jsonb_build_object(
          'id', i.id,
          'status', i.status,
          'algoVersion', i.algo_version,
          'createdAt', i.created_at,
          'expiresAt', i.expires_at
        ))
        from public.introductions i
        where i.user_a = uid or i.user_b = uid
      ),
      '[]'::jsonb
    ),
    'messages', coalesce(
      (
        select jsonb_agg(jsonb_build_object(
          'id', m.id,
          'conversationId', m.conversation_id,
          'body', m.body,
          'createdAt', m.created_at
        ))
        from public.messages m
        where m.sender_id = uid
      ),
      '[]'::jsonb
    )
  );
end;
$$;

grant execute on function public.export_own_data() to authenticated;

-- --------------------------------------------------------------------------
-- delete_own_account: remove personal data; keep anonymized safety records.
-- --------------------------------------------------------------------------
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  -- Anonymize reports this user filed or that name them. Notes they wrote go.
  update public.reports
     set reporter_id = case when reporter_id = uid then null else reporter_id end,
         note = case when reporter_id = uid then null else note end,
         reported_user_id = case when reported_user_id = uid then null else reported_user_id end
   where reporter_id = uid or reported_user_id = uid;

  delete from public.push_tokens where user_id = uid;

  -- Personal data: cascade from profiles covers claims, evidence, photos,
  -- preferences, consents, reflections, outcomes, tokens. ai_usage_log and
  -- product_events keep a null user_id for cost/analytics (no PII).
  delete from public.profiles where id = uid;
end;
$$;

grant execute on function public.delete_own_account() to authenticated;
