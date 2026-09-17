-- Kindred — human chat + safety: conversations, messages, blocks, reports, and
-- the server-side double-blind mutual decision RPC.

-- --------------------------------------------------------------------------
-- blocks (mutual enforcement is applied wherever pairs interact)
-- --------------------------------------------------------------------------
create table public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);
alter table public.blocks enable row level security;
create policy "blocks_rw_own" on public.blocks
  for all to authenticated using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());

-- --------------------------------------------------------------------------
-- reports (reporter identity is never visible to the reported user)
-- --------------------------------------------------------------------------
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reported_user_id uuid not null references public.profiles (id) on delete cascade,
  category report_category not null,
  context_type text not null,
  context_id uuid,
  note text,
  status report_status not null default 'open',
  created_at timestamptz not null default now()
);
alter table public.reports enable row level security;
create policy "reports_insert_own" on public.reports
  for insert to authenticated with check (reporter_id = auth.uid());
create policy "reports_select_own" on public.reports
  for select to authenticated using (reporter_id = auth.uid());
-- The reported user has no visibility; admins review via the service role.

-- --------------------------------------------------------------------------
-- conversations + messages (participant-only, block-aware)
-- --------------------------------------------------------------------------
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null unique references public.matches (id) on delete cascade,
  created_at timestamptz not null default now(),
  last_message_at timestamptz
);
alter table public.conversations enable row level security;
create policy "conversations_select_participant" on public.conversations
  for select to authenticated using (
    exists (
      select 1 from public.matches m
      where m.id = conversations.match_id and (m.user_a = auth.uid() or m.user_b = auth.uid())
    )
  );

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index messages_conversation_idx on public.messages (conversation_id, created_at);
alter table public.messages enable row level security;

create policy "messages_select_participant" on public.messages
  for select to authenticated using (
    exists (
      select 1 from public.conversations c
      join public.matches m on m.id = c.match_id
      where c.id = messages.conversation_id and (m.user_a = auth.uid() or m.user_b = auth.uid())
    )
  );

create policy "messages_insert_participant" on public.messages
  for insert to authenticated with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      join public.matches m on m.id = c.match_id
      where c.id = messages.conversation_id
        and (m.user_a = auth.uid() or m.user_b = auth.uid())
        -- No active block between the two participants.
        and not exists (
          select 1 from public.blocks b
          where (b.blocker_id = m.user_a and b.blocked_id = m.user_b)
             or (b.blocker_id = m.user_b and b.blocked_id = m.user_a)
        )
    )
  );

-- Participants may mark messages read (update read_at only).
create policy "messages_update_participant" on public.messages
  for update to authenticated using (
    exists (
      select 1 from public.conversations c
      join public.matches m on m.id = c.match_id
      where c.id = messages.conversation_id and (m.user_a = auth.uid() or m.user_b = auth.uid())
    )
  );

-- --------------------------------------------------------------------------
-- submit_decision: double-blind mutual detection, server-side.
-- Reads BOTH decisions with definer privilege (a client never can), applies the
-- block guard, and creates the match + conversation on mutual interest.
-- --------------------------------------------------------------------------
create or replace function public.submit_decision(p_introduction_id uuid, p_decision decision)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_intro public.introductions%rowtype;
  v_other uuid;
  v_other_decision decision;
  v_match_id uuid;
  v_conv_id uuid;
begin
  select * into v_intro from public.introductions where id = p_introduction_id;
  if not found then raise exception 'introduction not found'; end if;
  if auth.uid() <> v_intro.user_a and auth.uid() <> v_intro.user_b then
    raise exception 'forbidden';
  end if;
  v_other := case when v_intro.user_a = auth.uid() then v_intro.user_b else v_intro.user_a end;

  insert into public.introduction_decisions (introduction_id, user_id, decision)
  values (p_introduction_id, auth.uid(), p_decision)
  on conflict (introduction_id, user_id)
  do update set decision = excluded.decision, decided_at = now();

  if p_decision = 'not_for_me' then
    update public.introductions set status = 'closed' where id = p_introduction_id;
    return jsonb_build_object('mutual', false, 'conversationId', null);
  end if;

  -- Never match blocked pairs.
  if exists (
    select 1 from public.blocks b
    where (b.blocker_id = auth.uid() and b.blocked_id = v_other)
       or (b.blocker_id = v_other and b.blocked_id = auth.uid())
  ) then
    return jsonb_build_object('mutual', false, 'conversationId', null);
  end if;

  select decision into v_other_decision
  from public.introduction_decisions
  where introduction_id = p_introduction_id and user_id = v_other;

  if v_other_decision is distinct from 'interested' then
    return jsonb_build_object('mutual', false, 'conversationId', null);
  end if;

  select id into v_match_id from public.matches where introduction_id = p_introduction_id;
  if v_match_id is null then
    update public.introductions set status = 'matched' where id = p_introduction_id;
    insert into public.matches (introduction_id, user_a, user_b)
    values (p_introduction_id, v_intro.user_a, v_intro.user_b)
    returning id into v_match_id;
    insert into public.conversations (match_id) values (v_match_id) returning id into v_conv_id;
  else
    select id into v_conv_id from public.conversations where match_id = v_match_id;
  end if;

  return jsonb_build_object('mutual', true, 'conversationId', v_conv_id);
end;
$$;
grant execute on function public.submit_decision(uuid, decision) to authenticated;
