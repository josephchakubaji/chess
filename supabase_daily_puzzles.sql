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
  elo_processed boolean not null default false,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

alter table public.game_history
add column if not exists elo_processed boolean not null default false;

alter table public.game_history enable row level security;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  elo_rating integer not null default 1200 check (elo_rating between 100 and 4000),
  games_played integer not null default 0 check (games_played >= 0),
  wins integer not null default 0 check (wins >= 0),
  losses integer not null default 0 check (losses >= 0),
  draws integer not null default 0 check (draws >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists elo_rating integer not null default 1200;
alter table public.profiles add column if not exists games_played integer not null default 0;
alter table public.profiles add column if not exists wins integer not null default 0;
alter table public.profiles add column if not exists losses integer not null default 0;
alter table public.profiles add column if not exists draws integer not null default 0;
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

alter table public.profiles enable row level security;

drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
on public.profiles
for select
using (auth.uid() = id);

create or replace function public.create_profile_for_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data ->> 'display_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
after insert on auth.users
for each row execute function public.create_profile_for_user();

revoke all on function public.create_profile_for_user() from public;

create or replace function public.get_my_profile()
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  profile public.profiles;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  insert into public.profiles (id) values (auth.uid()) on conflict (id) do nothing;
  select * into profile from public.profiles where id = auth.uid();
  return profile;
end;
$$;

revoke all on function public.get_my_profile() from public;
grant execute on function public.get_my_profile() to authenticated;

create or replace function public.get_leaderboard(p_limit integer default 100)
returns table (
  rank bigint,
  user_id uuid,
  display_name text,
  elo_rating integer,
  games_played integer,
  wins integer,
  losses integer,
  draws integer
)
language sql
security definer
set search_path = public
as $$
  select
    row_number() over (order by p.elo_rating desc, p.games_played desc, p.created_at asc) as rank,
    p.id as user_id,
    coalesce(nullif(trim(p.display_name), ''), 'Player') as display_name,
    p.elo_rating,
    p.games_played,
    p.wins,
    p.losses,
    p.draws
  from public.profiles p
  order by p.elo_rating desc, p.games_played desc, p.created_at asc
  limit least(greatest(coalesce(p_limit, 100), 1), 100);
$$;

revoke all on function public.get_leaderboard(integer) from public;
grant execute on function public.get_leaderboard(integer) to authenticated;

insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;

update public.profiles p
set display_name = coalesce(nullif(p.display_name, ''), u.raw_user_meta_data ->> 'display_name'),
    updated_at = now()
from auth.users u
where u.id = p.id
  and (p.display_name is null or p.display_name = '');

create or replace function public.record_elo_result(p_game_id uuid, p_result text)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  game_record public.game_history;
  player public.profiles;
  opponent_rating integer := 1200;
  k_factor integer;
  expected numeric;
  score numeric;
  next_rating integer;
begin
  if p_result not in ('win', 'loss', 'draw') then
    raise exception 'Invalid Elo result';
  end if;

  select * into game_record
  from public.game_history
  where id = p_game_id and user_id = auth.uid()
  for update;

  if not found then raise exception 'Game not found'; end if;
  if game_record.status not in ('completed', 'draw') then raise exception 'Game is not completed'; end if;
  if game_record.elo_processed then
    select * into player from public.profiles where id = auth.uid();
    return player;
  end if;
  if game_record.mode not in ('computer', 'private') then
    update public.game_history set elo_processed = true where id = p_game_id;
    select * into player from public.profiles where id = auth.uid();
    return player;
  end if;

  insert into public.profiles (id) values (auth.uid()) on conflict (id) do nothing;
  select * into player from public.profiles where id = auth.uid() for update;
  k_factor := case when player.games_played < 30 then 32 else 16 end;
  expected := 1.0 / (1.0 + power(10.0, (opponent_rating - player.elo_rating) / 400.0));
  score := case p_result when 'win' then 1.0 when 'loss' then 0.0 else 0.5 end;
  next_rating := greatest(100, least(4000, round(player.elo_rating + k_factor * (score - expected))::integer));

  update public.profiles
  set elo_rating = next_rating,
      games_played = games_played + 1,
      wins = wins + case when p_result = 'win' then 1 else 0 end,
      losses = losses + case when p_result = 'loss' then 1 else 0 end,
      draws = draws + case when p_result = 'draw' then 1 else 0 end,
      updated_at = now()
  where id = auth.uid()
  returning * into player;

  update public.game_history set elo_processed = true where id = p_game_id;
  return player;
end;
$$;

revoke all on function public.record_elo_result(uuid, text) from public;
grant execute on function public.record_elo_result(uuid, text) to authenticated;

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
