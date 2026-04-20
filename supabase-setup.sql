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

alter table public.profiles enable row level security;
alter table public.runner_workspaces enable row level security;

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
