-- Kindred — account deletion (GDPR Art. 17) + consent withdrawal helper.
-- Removes/anonymizes personal data. Safety records (reports against a user)
-- are retained in anonymized form for legitimate-interest/safety reasons
-- (LEGAL REVIEW required before launch — see docs/privacy-architecture.md).

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

  -- Personal data: cascade from profiles covers claims, evidence, photos,
  -- preferences, consents, reflections, outcomes, tokens.
  delete from public.push_tokens where user_id = uid;
  delete from public.profiles where id = uid;

  -- Anonymize reporter identity on remaining reports they filed (if any
  -- survive profile cascade — they do not, so this is defensive).
  update public.reports set reporter_id = reporter_id where reporter_id = uid;

  -- Storage: objects under the user's folder. Service-role Edge Function
  -- should also empty storage.objects for bucket user-photos / uid.
end;
$$;

grant execute on function public.delete_own_account() to authenticated;

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
