alter table public.game_history
add column if not exists player_color text check (player_color in ('w', 'b'));

alter table public.game_history
add column if not exists clock_ms jsonb;

alter table public.game_history
add column if not exists last_move_at timestamptz not null default now();

create or replace function public.validate_game_history_authoritative_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role'
     and (
       new.current_fen is distinct from old.current_fen
       or new.pgn is distinct from old.pgn
       or new.clock_ms is distinct from old.clock_ms
       or new.last_move_at is distinct from old.last_move_at
     ) then
    raise exception 'Move state can only be updated by the server';
  end if;
  return new;
end;
$$;

drop trigger if exists game_history_authoritative_update on public.game_history;
create trigger game_history_authoritative_update
before update on public.game_history
for each row
execute function public.validate_game_history_authoritative_update();

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
  last_move_at timestamptz
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
    gh.last_move_at
  from public.game_history gh
  where gh.user_id = auth.uid()
    and gh.mode = 'private'
    and gh.status = 'in_progress'
    and gh.room_code is not null
  order by gh.created_at desc
  limit 1;
$$;

revoke all on function public.get_active_game() from public;
grant execute on function public.get_active_game() to authenticated;
