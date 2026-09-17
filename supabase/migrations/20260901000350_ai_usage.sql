-- Kindred — AI usage logging for cost/latency accounting.
-- Written only by Edge Functions (service role). NEVER stores raw prompts.

create table public.ai_usage_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  task_type ai_task_type not null,
  model text not null,
  latency_ms int,
  input_tokens int,
  output_tokens int,
  success boolean not null,
  error_code text,
  created_at timestamptz not null default now()
);
create index ai_usage_log_task_idx on public.ai_usage_log (task_type, created_at);

alter table public.ai_usage_log enable row level security;
-- No policies: only the service role (Edge Functions) reads/writes this table.
-- It is never exposed to app users.
