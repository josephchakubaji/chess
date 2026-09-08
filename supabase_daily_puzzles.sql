create table if not exists public.daily_puzzles (
  date date primary key,
  puzzle_id text not null,
  source_puzzle_id text,
  title text not null,
  category text not null default 'Advanced',
  goal text not null,
  fen text not null,
  solution jsonb not null,
  hint text,
  rating integer,
  themes text[] not null default '{}',
  source text not null default 'lichess-api',
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_daily_puzzles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists daily_puzzles_set_updated_at on public.daily_puzzles;
create trigger daily_puzzles_set_updated_at
before update on public.daily_puzzles
for each row
execute function public.set_daily_puzzles_updated_at();

alter table public.daily_puzzles enable row level security;

do $$
declare
  policy_record record;
begin
  for policy_record in
    select policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'daily_puzzles'
  loop
    execute format('drop policy if exists %I on public.daily_puzzles', policy_record.policyname);
  end loop;
end
$$;

create policy "Authenticated users can read daily puzzles"
on public.daily_puzzles
for select
using (auth.role() = 'authenticated');

-- Daily puzzle writes are server-only. Use the save-daily-puzzle edge function
-- with its service-role key; never expose that key in browser code.

create table if not exists public.game_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mode text not null,
  opponent text not null,
  time_control text not null default 'unlimited',
  status text not null default 'in_progress',
  result text,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

alter table public.game_history enable row level security;

do $$
declare
  policy_record record;
begin
  for policy_record in
    select policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'game_history'
  loop
    execute format('drop policy if exists %I on public.game_history', policy_record.policyname);
  end loop;
end
$$;

drop policy if exists "Users can view their own game history" on public.game_history;
create policy "Users can view their own game history"
on public.game_history
for select
using (auth.uid() = user_id);

drop policy if exists "Users can create their own game history" on public.game_history;
create policy "Users can create their own game history"
on public.game_history
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own game history" on public.game_history;
create policy "Users can update their own game history"
on public.game_history
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Remove previously stored third-party payloads that may contain metadata.
update public.daily_puzzles set raw_payload = null where raw_payload is not null;

-- Private rooms are coordinated through authenticated Realtime channels.
-- Keep the legacy table inaccessible through the public API.
do $$
declare
  policy_record record;
begin
  if to_regclass('public.chess_rooms') is not null then
    alter table public.chess_rooms enable row level security;
    for policy_record in
      select policyname
      from pg_policies
      where schemaname = 'public' and tablename = 'chess_rooms'
    loop
      execute format('drop policy if exists %I on public.chess_rooms', policy_record.policyname);
    end loop;
  end if;
end
$$;

-- Realtime channels used by the app are private and require an authenticated user.
drop policy if exists "Authenticated users can use chess realtime channels" on realtime.messages;
create policy "Authenticated users can use chess realtime channels"
on realtime.messages
for all
to authenticated
using (realtime.topic() like 'chess-%')
with check (realtime.topic() like 'chess-%');

-- One-time cleanup query: purge any seeded practice puzzles from the daily table
delete from public.daily_puzzles where source != 'lichess-api';
