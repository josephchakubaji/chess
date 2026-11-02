create table if not exists public.private_room_memberships (
  room_code text not null check (room_code ~ '^[A-Z0-9]{6}$'),
  user_id uuid not null references auth.users(id) on delete cascade,
  is_host boolean not null default false,
  joined_at timestamptz not null default now(),
  primary key (room_code, user_id)
);

create unique index if not exists private_room_one_host
on public.private_room_memberships (room_code)
where is_host;

alter table public.private_room_memberships enable row level security;
revoke all on public.private_room_memberships from anon, authenticated;
grant select on public.private_room_memberships to authenticated;

drop policy if exists "Users can view their private room memberships" on public.private_room_memberships;
create policy "Users can view their private room memberships"
on public.private_room_memberships
for select
to authenticated
using (auth.uid() = user_id);

insert into public.private_room_memberships (room_code, user_id, is_host)
select room_code, user_id, player_number = 1
from (
  select
    room_code,
    user_id,
    row_number() over (
      partition by room_code
      order by (player_color = 'w') desc, created_at
    ) as player_number
  from public.game_history
  where mode = 'private'
    and status = 'in_progress'
    and room_code ~ '^[A-Z0-9]{6}$'
) active_players
where player_number <= 2
on conflict (room_code, user_id) do nothing;

create or replace function public.join_private_chess_room(
  p_room_code text,
  p_create boolean default false
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  normalized_code text := upper(trim(coalesce(p_room_code, '')));
  room_size integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if normalized_code !~ '^[A-Z0-9]{6}$' then
    raise exception 'Invalid room code';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(normalized_code, 0));

  if exists (
    select 1
    from public.private_room_memberships
    where room_code = normalized_code and user_id = auth.uid()
  ) then
    return;
  end if;

  select count(*) into room_size
  from public.private_room_memberships
  where room_code = normalized_code;

  if p_create then
    if room_size <> 0 then
      raise exception 'Room code is already in use';
    end if;
    insert into public.private_room_memberships (room_code, user_id, is_host)
    values (normalized_code, auth.uid(), true);
    return;
  end if;

  if room_size = 0 then
    raise exception 'Room not found';
  end if;
  if room_size >= 2 then
    raise exception 'Room is full';
  end if;

  insert into public.private_room_memberships (room_code, user_id, is_host)
  values (normalized_code, auth.uid(), false);
end;
$$;

revoke all on function public.join_private_chess_room(text, boolean) from public, anon;
grant execute on function public.join_private_chess_room(text, boolean) to authenticated;

alter table public.game_history
  add column if not exists initial_fen text,
  add column if not exists result_verified boolean not null default false;

drop function if exists public.get_active_game();
create function public.get_active_game()
returns table (
  id uuid,
  room_code text,
  pgn text,
  time_control text,
  created_at timestamptz,
  current_fen text,
  player_color text,
  clock_ms jsonb,
  last_move_at timestamptz,
  initial_fen text
)
language sql
security definer
set search_path = public, auth
as $$
  select
    gh.id,
    gh.room_code,
    gh.pgn,
    gh.time_control,
    gh.created_at,
    gh.current_fen,
    gh.player_color,
    gh.clock_ms,
    gh.last_move_at,
    gh.initial_fen
  from public.game_history gh
  where gh.user_id = auth.uid()
    and gh.mode = 'private'
    and gh.status = 'in_progress'
    and gh.room_code is not null
  order by gh.created_at desc
  limit 1;
$$;

revoke all on function public.get_active_game() from public, anon;
grant execute on function public.get_active_game() to authenticated;

create or replace function public.protect_game_history_updates()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') = 'service_role' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.user_id is distinct from auth.uid() then
      raise exception 'Game records can only be created for the authenticated user';
    end if;
    if new.status <> 'in_progress'
       or new.result is not null
       or new.finished_at is not null
       or new.elo_processed
       or new.result_verified then
      raise exception 'Game results can only be recorded by the server';
    end if;

    if new.mode = 'private' then
      if new.room_code is null
         or new.player_color is null
         or new.player_color not in ('w', 'b')
         or not exists (
           select 1
           from public.private_room_memberships
           where room_code = new.room_code and user_id = new.user_id
         ) then
        raise exception 'User is not a member of this private room';
      end if;
      perform pg_advisory_xact_lock(hashtextextended(new.room_code, 0));
      if exists (
        select 1
        from public.game_history
        where room_code = new.room_code
          and mode = 'private'
          and status = 'in_progress'
          and user_id = new.user_id
      ) then
        raise exception 'User already has an active game in this room';
      end if;
      if exists (
        select 1
        from public.game_history
        where room_code = new.room_code
          and mode = 'private'
          and status = 'in_progress'
          and player_color = new.player_color
          and new.player_color is not null
      ) then
        raise exception 'Player side is already assigned';
      end if;
      if coalesce(new.pgn, '') <> '' then
        raise exception 'A new game cannot contain moves';
      end if;
      new.initial_fen := new.current_fen;
    end if;
    return new;
  end if;

  if old.mode <> 'private' then
    return new;
  end if;

  if new.id is distinct from old.id
     or new.user_id is distinct from old.user_id
     or new.mode is distinct from old.mode
     or new.opponent is distinct from old.opponent
     or new.time_control is distinct from old.time_control
     or new.created_at is distinct from old.created_at
     or new.room_code is distinct from old.room_code
     or new.current_fen is distinct from old.current_fen
     or new.initial_fen is distinct from old.initial_fen
     or new.pgn is distinct from old.pgn
     or new.clock_ms is distinct from old.clock_ms
     or new.last_move_at is distinct from old.last_move_at
     or new.result is distinct from old.result
     or new.result_verified is distinct from old.result_verified then
    raise exception 'Private game state can only be updated by the server';
  end if;

  if new.status is distinct from old.status
     and not (
       new.status = 'abandoned'
       and old.status = 'in_progress'
       and new.result is null
       and new.finished_at is not null
     ) then
    raise exception 'Private game results can only be recorded by the server';
  end if;

  if new.finished_at is distinct from old.finished_at
     and not (
       new.status = 'abandoned'
       and old.status = 'in_progress'
       and new.result is null
       and new.finished_at is not null
     ) then
    raise exception 'Private game results can only be recorded by the server';
  end if;

  if old.result_verified
     and not old.elo_processed
     and new.elo_processed
     and new.player_color is not distinct from old.player_color then
    return new;
  end if;
  if new.elo_processed is distinct from old.elo_processed then
    raise exception 'Elo processing can only be recorded once';
  end if;

  if old.player_color is null
     and new.player_color in ('w', 'b') then
    perform pg_advisory_xact_lock(hashtextextended(old.room_code, 0));
    if not exists (
      select 1
      from public.game_history opponent
      where opponent.room_code = old.room_code
        and opponent.mode = 'private'
        and opponent.status = 'in_progress'
        and opponent.user_id <> old.user_id
        and opponent.player_color = new.player_color
    ) then
      return new;
    end if;
  end if;

  if new.player_color is distinct from old.player_color then
    raise exception 'Private game side cannot be changed';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_game_history_updates on public.game_history;
create trigger protect_game_history_updates
before insert or update on public.game_history
for each row
execute function public.protect_game_history_updates();

create or replace function public.cleanup_private_game_reconnection()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status = 'in_progress' and new.status <> 'in_progress'
     and new.room_code is not null
     and not exists (
       select 1
       from public.game_history
       where room_code = new.room_code
         and mode = 'private'
         and status = 'in_progress'
     ) then
    delete from public.private_game_reconnections
    where room_code = new.room_code;
  end if;
  return new;
end;
$$;

create or replace function public.finish_private_game(
  p_game_id uuid,
  p_room_code text,
  p_status text,
  p_winning_color text,
  p_expected_fen text,
  p_expected_last_move_at timestamptz
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  active_players integer;
  distinct_colors integer;
  updated_players integer;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Only the game server can finish a private game';
  end if;
  if p_room_code is null or p_room_code !~ '^[A-Z0-9]{6}$'
     or p_game_id is null
     or p_status is null
     or p_status not in ('completed', 'draw')
     or (p_status = 'completed' and (p_winning_color is null or p_winning_color not in ('w', 'b')))
     or (p_status = 'draw' and p_winning_color is not null)
     or p_expected_fen is null
     or p_expected_last_move_at is null then
    raise exception 'Invalid private game result';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_room_code, 0));
  select count(*), count(distinct player_color)
  into active_players, distinct_colors
  from public.game_history
  where room_code = p_room_code
    and mode = 'private'
    and status = 'in_progress';
  if active_players <> 2 or distinct_colors <> 2 then
    raise exception 'Both players must have active game records';
  end if;
  if not exists (
    select 1
    from public.game_history
    where id = p_game_id
      and room_code = p_room_code
      and mode = 'private'
      and status = 'in_progress'
      and current_fen = p_expected_fen
      and last_move_at = p_expected_last_move_at
  ) then
    raise exception 'The game state changed before it could be finished';
  end if;
  if (
    select count(*)
    from public.game_history
    where room_code = p_room_code
      and mode = 'private'
      and status = 'in_progress'
      and current_fen = p_expected_fen
      and last_move_at = p_expected_last_move_at
  ) <> 2 then
    raise exception 'The players do not have matching game states';
  end if;

  update public.game_history
  set status = p_status,
      result = case
        when p_status = 'draw' then 'draw'
        when player_color = p_winning_color then 'win'
        else 'loss'
      end,
      result_verified = true,
      finished_at = now()
  where room_code = p_room_code
    and mode = 'private'
    and status = 'in_progress'
    and current_fen = p_expected_fen
    and last_move_at = p_expected_last_move_at;

  get diagnostics updated_players = row_count;
  if updated_players <> 2 then
    raise exception 'Could not finish both game records';
  end if;
  return updated_players;
end;
$$;

revoke all on function public.finish_private_game(uuid, text, text, text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.finish_private_game(uuid, text, text, text, text, timestamptz) to service_role;

create or replace function public.expire_private_game_reconnections()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  expired_game record;
  games_expired integer := 0;
begin
  perform set_config('request.jwt.claim.role', 'service_role', true);

  for expired_game in
    select room_code, disconnected_user_id
    from public.private_game_reconnections
    where state = 'waiting' and deadline <= now()
    for update
  loop
    update public.game_history
    set status = 'completed',
        result = case
          when user_id = expired_game.disconnected_user_id then 'loss'
          else 'win'
        end,
        result_verified = true,
        finished_at = now()
    where room_code = expired_game.room_code
      and mode = 'private'
      and status = 'in_progress';

    delete from public.private_game_reconnections
    where room_code = expired_game.room_code;
    games_expired := games_expired + 1;
  end loop;
  return games_expired;
end;
$$;

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
  if game_record.status not in ('completed', 'draw') then
    raise exception 'Game is not completed';
  end if;
  if game_record.mode = 'private'
     and (not game_record.result_verified or game_record.result is distinct from p_result) then
    raise exception 'The server has not verified this game result';
  end if;
  if game_record.elo_processed then
    select * into player from public.profiles where id = auth.uid();
    return player;
  end if;
  if game_record.mode <> 'private' then
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

revoke all on function public.record_elo_result(uuid, text) from public, anon;
grant execute on function public.record_elo_result(uuid, text) to authenticated;

revoke all on function public.update_game_pgn(uuid, text) from public, anon, authenticated;
grant execute on function public.update_game_pgn(uuid, text) to service_role;

drop policy if exists "Authenticated users can use chess realtime channels" on realtime.messages;
drop policy if exists "Chess room members can use private room channels" on realtime.messages;
create policy "Chess room members can use private room channels"
on realtime.messages
as permissive
for all
to authenticated
using (
  realtime.topic() = 'chess-active-players'
  or (
    realtime.topic() ~ '^chess-room-[A-Z0-9]{6}$'
    and exists (
      select 1
      from public.private_room_memberships membership
      where membership.room_code = right(realtime.topic(), 6)
        and membership.user_id = auth.uid()
    )
  )
)
with check (
  realtime.topic() = 'chess-active-players'
  or (
    realtime.topic() ~ '^chess-room-[A-Z0-9]{6}$'
    and exists (
      select 1
      from public.private_room_memberships membership
      where membership.room_code = right(realtime.topic(), 6)
        and membership.user_id = auth.uid()
    )
  )
);

drop policy if exists "Restrict chess realtime channels to room members" on realtime.messages;
create policy "Restrict chess realtime channels to room members"
on realtime.messages
as restrictive
for all
to authenticated
using (
  realtime.topic() = 'chess-active-players'
  or (
    realtime.topic() ~ '^chess-room-[A-Z0-9]{6}$'
    and exists (
      select 1
      from public.private_room_memberships membership
      where membership.room_code = right(realtime.topic(), 6)
        and membership.user_id = auth.uid()
    )
  )
)
with check (
  realtime.topic() = 'chess-active-players'
  or (
    realtime.topic() ~ '^chess-room-[A-Z0-9]{6}$'
    and exists (
      select 1
      from public.private_room_memberships membership
      where membership.room_code = right(realtime.topic(), 6)
        and membership.user_id = auth.uid()
    )
  )
);
