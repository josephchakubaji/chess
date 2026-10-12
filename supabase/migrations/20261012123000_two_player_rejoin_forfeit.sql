-- Resume private games only after both players return within five minutes.
-- Otherwise finish the game with the disconnected player recorded as the loser.
create table if not exists public.private_game_reconnections (
  room_code text primary key,
  disconnected_user_id uuid not null references auth.users(id) on delete cascade,
  deadline timestamptz,
  rejoined_user_ids uuid[] not null default '{}',
  state text not null default 'waiting' check (state in ('waiting', 'ready'))
);

alter table public.private_game_reconnections enable row level security;
revoke all on public.private_game_reconnections from anon, authenticated;

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

drop trigger if exists game_history_cleanup_private_reconnection on public.game_history;
create trigger game_history_cleanup_private_reconnection
after update of status on public.game_history
for each row
execute function public.cleanup_private_game_reconnection();

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

revoke all on function public.expire_private_game_reconnections() from public, anon, authenticated;
grant execute on function public.expire_private_game_reconnections() to service_role;

create or replace function public.update_private_game_rejoin(
  p_user_id uuid,
  p_room_code text,
  p_action text,
  p_disconnected_user_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  player_ids uuid[];
  other_player_id uuid;
  reconnect_state public.private_game_reconnections;
  player_result text;
begin
  if coalesce(auth.role(), '') <> 'service_role'
     and auth.uid() is distinct from p_user_id then
    raise exception 'Not authorized';
  end if;
  if p_action not in ('left', 'rejoin', 'status') then
    raise exception 'Invalid rejoin action';
  end if;
  if p_room_code is null or p_room_code = '' then
    raise exception 'Room code is required';
  end if;

  select array_agg(distinct user_id)
  into player_ids
  from public.game_history
  where room_code = p_room_code
    and mode = 'private'
    and status = 'in_progress';

  if player_ids is null or not (p_user_id = any(player_ids)) then
    select result into player_result
    from public.game_history
    where room_code = p_room_code and user_id = p_user_id and mode = 'private'
    order by created_at desc
    limit 1;
    return jsonb_build_object(
      'state', case when player_result is null then 'not_found' else 'finished' end,
      'result', player_result
    );
  end if;

  if cardinality(player_ids) <> 2 then
    raise exception 'Both players must have an active game record';
  end if;

  if p_action = 'left' then
    if p_disconnected_user_id is null then
      select player.user_id into other_player_id
      from unnest(player_ids) as player(user_id)
      where player.user_id <> p_user_id
      limit 1;
    else
      other_player_id := p_disconnected_user_id;
    end if;
    if not (other_player_id = any(player_ids)) then
      raise exception 'Disconnected player is not in this game';
    end if;

    insert into public.private_game_reconnections (
      room_code, disconnected_user_id, deadline, rejoined_user_ids, state
    )
    values (
      p_room_code, other_player_id, now() + interval '5 minutes', '{}', 'waiting'
    )
    on conflict (room_code) do update
    set disconnected_user_id = case
          when private_game_reconnections.state = 'ready'
            then excluded.disconnected_user_id
          else private_game_reconnections.disconnected_user_id
        end,
        deadline = case
          when private_game_reconnections.state = 'ready'
            then excluded.deadline
          else private_game_reconnections.deadline
        end,
        rejoined_user_ids = case
          when private_game_reconnections.state = 'ready' then '{}'
          else private_game_reconnections.rejoined_user_ids
        end,
        state = 'waiting';
  elsif p_action = 'rejoin' then
    perform public.expire_private_game_reconnections();

    select result into player_result
    from public.game_history
    where room_code = p_room_code and user_id = p_user_id and mode = 'private'
    order by created_at desc
    limit 1;
    if player_result is not null then
      return jsonb_build_object('state', 'finished', 'result', player_result);
    end if;

    select * into reconnect_state
    from public.private_game_reconnections
    where room_code = p_room_code
    for update;

    if not found then
      select player.user_id into other_player_id
      from unnest(player_ids) as player(user_id)
      where player.user_id <> p_user_id
      limit 1;

      insert into public.private_game_reconnections (
        room_code, disconnected_user_id, deadline, rejoined_user_ids, state
      )
      values (
        p_room_code, other_player_id, now() + interval '5 minutes',
        array[p_user_id], 'waiting'
      )
      on conflict (room_code) do nothing;

      select * into reconnect_state
      from public.private_game_reconnections
      where room_code = p_room_code
      for update;
    end if;

    if reconnect_state.state = 'ready' then
      return jsonb_build_object('state', 'ready', 'deadline', null);
    else
      update public.private_game_reconnections
      set rejoined_user_ids = case
        when p_user_id = any(rejoined_user_ids) then rejoined_user_ids
        else array_append(rejoined_user_ids, p_user_id)
      end
      where room_code = p_room_code
      returning * into reconnect_state;
    end if;

    if (select bool_and(player.user_id = any(reconnect_state.rejoined_user_ids))
        from unnest(player_ids) as player(user_id)) then
      update public.private_game_reconnections
      set state = 'ready', deadline = null
      where room_code = p_room_code;
      return jsonb_build_object('state', 'ready', 'deadline', null);
    end if;
  else
    perform public.expire_private_game_reconnections();

    select result into player_result
    from public.game_history
    where room_code = p_room_code and user_id = p_user_id and mode = 'private'
    order by created_at desc
    limit 1;
    if player_result is not null then
      return jsonb_build_object('state', 'finished', 'result', player_result);
    end if;

    select * into reconnect_state
    from public.private_game_reconnections
    where room_code = p_room_code;
    if not found then
      return jsonb_build_object('state', 'active');
    end if;
  end if;

  select * into reconnect_state
  from public.private_game_reconnections
  where room_code = p_room_code;

  return jsonb_build_object(
    'state', reconnect_state.state,
    'deadline', reconnect_state.deadline,
    'disconnected_user_id', reconnect_state.disconnected_user_id
  );
end;
$$;

revoke all on function public.update_private_game_rejoin(uuid, text, text, uuid) from public, anon, authenticated;
grant execute on function public.update_private_game_rejoin(uuid, text, text, uuid) to service_role;

create extension if not exists pg_cron;

select cron.unschedule('expire-private-game-reconnections')
where exists (
  select 1 from cron.job where jobname = 'expire-private-game-reconnections'
);

select cron.schedule(
  'expire-private-game-reconnections',
  '* * * * *',
  'select public.expire_private_game_reconnections();'
);
