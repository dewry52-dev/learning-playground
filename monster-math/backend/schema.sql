create table public.learning_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_id uuid not null unique,
  type text not null check (type in ('m21','m31','m22','d21','d31','r21','r31')),
  correct integer not null check (correct between 0 and 5),
  attempts integer not null check (attempts >= correct and attempts <= 10000),
  completed_at timestamptz not null default now()
);
create index learning_records_user_date on public.learning_records(user_id, completed_at desc);
alter table public.learning_records enable row level security;
revoke all on public.learning_records from anon, authenticated;
grant select on public.learning_records to authenticated;
create policy own_learning_records on public.learning_records for select to authenticated
using ((select auth.uid()) = user_id);

-- Only backend service credentials may read or modify game state.
create table public.monster_state (
  id text primary key,
  version bigint not null default 0,
  state jsonb not null,
  expires_at timestamptz not null
);
alter table public.monster_state enable row level security;
revoke all on public.monster_state from anon, authenticated;
create index monster_state_expiry on public.monster_state(expires_at);

create table public.monster_rate_limits (
  id text primary key,
  count integer not null default 0,
  until_at timestamptz not null
);
alter table public.monster_rate_limits enable row level security;
revoke all on public.monster_rate_limits from anon, authenticated;
grant all on public.learning_records, public.monster_state, public.monster_rate_limits to service_role;

create function public.monster_take_rate(p_id text, p_limit integer, p_seconds integer)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare n integer;
begin
  insert into public.monster_rate_limits(id, count, until_at)
  values(p_id, 1, now() + make_interval(secs => p_seconds))
  on conflict(id) do update set
    count = case when public.monster_rate_limits.until_at < now() then 1 else public.monster_rate_limits.count + 1 end,
    until_at = case when public.monster_rate_limits.until_at < now() then now() + make_interval(secs => p_seconds) else public.monster_rate_limits.until_at end
  returning count into n;
  delete from public.monster_rate_limits where until_at < now() - interval '1 day';
  return n <= p_limit;
end;
$$;
revoke all on function public.monster_take_rate(text, integer, integer) from public, anon, authenticated;
grant execute on function public.monster_take_rate(text, integer, integer) to service_role;
