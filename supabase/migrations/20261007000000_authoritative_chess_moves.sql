alter table public.game_history
add column if not exists current_fen text
not null default 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

create or replace function public.validate_game_history_authoritative_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_user <> 'supabase_service_role'
     and (
       new.current_fen is distinct from old.current_fen
       or new.pgn is distinct from old.pgn
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

create or replace function public.get_active_game()
returns table (
  id uuid,
  room_code text,
  pgn text,
  time_control text,
  created_at timestamptz,
  current_fen text
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
    gh.current_fen
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
