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

-- ---------- sessions (scheduled appointments) ----------
create table if not exists public.sessions (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id text not null,
  scheduled_at timestamptz not null,
  duration_minutes integer not null default 60,
  status text not null default 'upcoming',
  notes text default '',
  updated_at timestamptz not null default now()
);

create index if not exists sessions_user_id_idx on public.sessions(user_id);
create index if not exists sessions_scheduled_at_idx on public.sessions(scheduled_at);
create index if not exists sessions_user_scheduled_idx on public.sessions(user_id, scheduled_at);

alter table public.sessions enable row level security;

drop policy if exists "sessions read own" on public.sessions;
drop policy if exists "sessions insert own" on public.sessions;
drop policy if exists "sessions update own" on public.sessions;
drop policy if exists "sessions delete own" on public.sessions;

create policy "sessions read own"
  on public.sessions for select
  using (auth.uid() = user_id);

create policy "sessions insert own"
  on public.sessions for insert
  with check (auth.uid() = user_id);

create policy "sessions update own"
  on public.sessions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "sessions delete own"
  on public.sessions for delete
  using (auth.uid() = user_id);

-- ---------- workout_presets (saved workout templates) ----------
create table if not exists public.workout_presets (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default '',
  description text default '',
  tags text[] not null default '{}',
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists workout_presets_user_id_idx on public.workout_presets(user_id);
create index if not exists workout_presets_user_created_idx on public.workout_presets(user_id, created_at desc);

alter table public.workout_presets enable row level security;

drop policy if exists "presets read own" on public.workout_presets;
drop policy if exists "presets insert own" on public.workout_presets;
drop policy if exists "presets update own" on public.workout_presets;
drop policy if exists "presets delete own" on public.workout_presets;

create policy "presets read own"
  on public.workout_presets for select
  using (auth.uid() = user_id);

create policy "presets insert own"
  on public.workout_presets for insert
  with check (auth.uid() = user_id);

create policy "presets update own"
  on public.workout_presets for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "presets delete own"
  on public.workout_presets for delete
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
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'sessions'
  ) then
    alter publication supabase_realtime add table public.sessions;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'workout_presets'
  ) then
    alter publication supabase_realtime add table public.workout_presets;
  end if;
end $$;
