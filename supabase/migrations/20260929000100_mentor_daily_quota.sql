-- Dedicated NextGen usage bookkeeping. No project text or mentor prompts are stored here.
create schema if not exists nextgen_private;
revoke all on schema nextgen_private from public, anon, authenticated;

create table if not exists nextgen_private.mentor_daily_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_day date not null,
  request_count integer not null check (request_count between 1 and 20),
  updated_at timestamptz not null default now(),
  primary key (user_id, usage_day)
);

alter table nextgen_private.mentor_daily_usage enable row level security;
revoke all on table nextgen_private.mentor_daily_usage from public, anon, authenticated;

-- The user cannot choose another identity, the day, or a larger allowance.
-- ON CONFLICT acquires the row lock, so concurrent requests share the same cap.
create or replace function public.consume_mentor_quota()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  accepted_count integer;
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  insert into nextgen_private.mentor_daily_usage (user_id, usage_day, request_count)
  values (caller_id, (now() at time zone 'UTC')::date, 1)
  on conflict (user_id, usage_day) do update
    set request_count = nextgen_private.mentor_daily_usage.request_count + 1,
        updated_at = now()
    where nextgen_private.mentor_daily_usage.request_count < 20
  returning request_count into accepted_count;

  return accepted_count is not null;
end;
$$;

revoke all on function public.consume_mentor_quota() from public, anon;
grant execute on function public.consume_mentor_quota() to authenticated;

comment on function public.consume_mentor_quota() is
  'Consumes one of 20 online mentor attempts per authenticated user per UTC day. No prompt data is stored.';
