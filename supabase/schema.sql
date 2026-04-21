-- Coach Workbook schema — 2-table split.
-- clients: one row per client (nested weeks/days/sets stay inside `data` jsonb).
-- library_exercises: one row per library template.
-- Per-entity writes keep saves small (50–500KB per client vs a whole-account blob)
-- and scale linearly with client count.

-- Drop legacy blob table (and its policies/publication entry) if present.
drop table if exists public.user_state cascade;

-- ---------- clients ----------
create table if not exists public.clients (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default '',
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists clients_user_id_idx on public.clients(user_id);

alter table public.clients enable row level security;

drop policy if exists "clients read own" on public.clients;
drop policy if exists "clients insert own" on public.clients;
drop policy if exists "clients update own" on public.clients;
drop policy if exists "clients delete own" on public.clients;

create policy "clients read own"
  on public.clients for select
  using (auth.uid() = user_id);

create policy "clients insert own"
  on public.clients for insert
  with check (auth.uid() = user_id);

create policy "clients update own"
  on public.clients for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "clients delete own"
  on public.clients for delete
  using (auth.uid() = user_id);

-- ---------- library_exercises ----------
create table if not exists public.library_exercises (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default '',
  main_muscle text,
  sub_muscles text[] not null default '{}',
  type text,
  updated_at timestamptz not null default now()
);

create index if not exists library_exercises_user_id_idx on public.library_exercises(user_id);

alter table public.library_exercises enable row level security;

drop policy if exists "library read own" on public.library_exercises;
drop policy if exists "library insert own" on public.library_exercises;
drop policy if exists "library update own" on public.library_exercises;
drop policy if exists "library delete own" on public.library_exercises;

create policy "library read own"
  on public.library_exercises for select
  using (auth.uid() = user_id);

create policy "library insert own"
  on public.library_exercises for insert
  with check (auth.uid() = user_id);

create policy "library update own"
  on public.library_exercises for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "library delete own"
  on public.library_exercises for delete
  using (auth.uid() = user_id);

-- ---------- realtime ----------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'clients'
  ) then
    alter publication supabase_realtime add table public.clients;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'library_exercises'
  ) then
    alter publication supabase_realtime add table public.library_exercises;
  end if;
end $$;
