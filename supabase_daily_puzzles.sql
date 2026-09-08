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

drop policy if exists "Daily puzzles are publicly readable" on public.daily_puzzles;
drop policy if exists "Authenticated users can read daily puzzles" on public.daily_puzzles;
create policy "Authenticated users can read daily puzzles"
on public.daily_puzzles
for select
using (auth.role() = 'authenticated');

drop policy if exists "Daily puzzles can be inserted by app clients" on public.daily_puzzles;
drop policy if exists "Daily puzzles can be updated by app clients" on public.daily_puzzles;
drop policy if exists "Daily puzzles can be deleted by app clients" on public.daily_puzzles;

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

-- One-time cleanup query: purge any seeded practice puzzles from the daily table
delete from public.daily_puzzles where source != 'lichess-api';
