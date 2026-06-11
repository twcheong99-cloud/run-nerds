create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text unique not null,
  name text,
  goal_race text,
  goal_time text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.runner_workspaces (
  user_id uuid primary key references auth.users (id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists runner_workspaces_set_updated_at on public.runner_workspaces;
create trigger runner_workspaces_set_updated_at
before update on public.runner_workspaces
for each row execute function public.set_updated_at();

create table if not exists public.coach_daily_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  usage_date date not null,
  call_count integer not null default 0,
  primary key (user_id, usage_date)
);

-- Consumed only by the coach Edge Function through the service role.
-- Returns the new call count for today, or -1 when the daily limit is exhausted.
create or replace function public.consume_coach_call(p_user_id uuid, p_daily_limit integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := (timezone('Asia/Seoul', now()))::date;
  v_count integer;
begin
  insert into public.coach_daily_usage as usage (user_id, usage_date, call_count)
  values (p_user_id, v_today, 1)
  on conflict (user_id, usage_date)
  do update set call_count = usage.call_count + 1
  where usage.call_count < p_daily_limit
  returning usage.call_count into v_count;

  return coalesce(v_count, -1);
end;
$$;

revoke all on function public.consume_coach_call(uuid, integer) from public;
revoke all on function public.consume_coach_call(uuid, integer) from anon;
revoke all on function public.consume_coach_call(uuid, integer) from authenticated;
grant execute on function public.consume_coach_call(uuid, integer) to service_role;

alter table public.profiles enable row level security;
alter table public.runner_workspaces enable row level security;
alter table public.coach_daily_usage enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "workspace_select_own" on public.runner_workspaces;
create policy "workspace_select_own"
on public.runner_workspaces
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "workspace_insert_own" on public.runner_workspaces;
create policy "workspace_insert_own"
on public.runner_workspaces
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "workspace_update_own" on public.runner_workspaces;
create policy "workspace_update_own"
on public.runner_workspaces
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
