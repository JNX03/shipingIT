-- Run only against the dedicated ShipingIT project after the quota migration.
-- All test identities and counters are rolled back, including on failed assertions.
begin;

do $$
begin
  assert (select relrowsecurity from pg_class where oid = 'nextgen_private.mentor_daily_usage'::regclass), 'RLS must be enabled';
  assert not has_schema_privilege('anon', 'nextgen_private', 'USAGE'), 'anon must not access private schema';
  assert not has_schema_privilege('authenticated', 'nextgen_private', 'USAGE'), 'users must not access private schema';
  assert not has_table_privilege('anon', 'nextgen_private.mentor_daily_usage', 'SELECT,INSERT,UPDATE,DELETE'), 'anon table grants';
  assert not has_table_privilege('authenticated', 'nextgen_private.mentor_daily_usage', 'SELECT,INSERT,UPDATE,DELETE'), 'user table grants';
  assert not has_function_privilege('anon', 'public.consume_mentor_quota()', 'EXECUTE'), 'anon RPC grant';
  assert has_function_privilege('authenticated', 'public.consume_mentor_quota()', 'EXECUTE'), 'authenticated RPC grant missing';
end $$;

insert into auth.users (id) values
  ('00000000-0000-4000-8000-000000001901'),
  ('00000000-0000-4000-8000-000000001902');
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000001901","role":"authenticated"}', true);
set local role authenticated;
do $$
declare i integer;
begin
  for i in 1..20 loop
    assert public.consume_mentor_quota(), 'First 20 calls must be allowed';
  end loop;
  assert not public.consume_mentor_quota(), 'Call 21 must be rejected';
  assert not public.consume_mentor_quota(), 'Repeated over-limit call must remain rejected';
end $$;
reset role;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000001902","role":"authenticated"}', true);
set local role authenticated;
do $$
begin
  assert public.consume_mentor_quota(), 'A different user must have an independent allowance';
end $$;
reset role;

select set_config('request.jwt.claims', '{}', true);
set local role authenticated;
do $$
declare rejected boolean := false;
begin
  begin
    perform public.consume_mentor_quota();
  exception when sqlstate '28000' then rejected := true;
  end;
  assert rejected, 'A missing identity must be rejected';
end $$;
reset role;

do $$
begin
  assert (select request_count = 20 from nextgen_private.mentor_daily_usage where user_id = '00000000-0000-4000-8000-000000001901' and usage_day = (now() at time zone 'UTC')::date), 'Count must stop at 20';
  assert (select request_count = 1 from nextgen_private.mentor_daily_usage where user_id = '00000000-0000-4000-8000-000000001902' and usage_day = (now() at time zone 'UTC')::date), 'Second user counter must stay independent';
end $$;
rollback;
select 'PASS: RLS, grants, authenticated role, 20-call cap, separate identities, missing identity; all test data rolled back' as quota_verification;
