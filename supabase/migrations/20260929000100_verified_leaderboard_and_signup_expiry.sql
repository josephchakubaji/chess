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
set search_path = public, auth
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
  join auth.users u on u.id = p.id and u.email_confirmed_at is not null
  order by p.elo_rating desc, p.games_played desc, p.created_at asc
  limit least(greatest(coalesce(p_limit, 100), 1), 100);
$$;

revoke all on function public.get_leaderboard(integer) from public;
grant execute on function public.get_leaderboard(integer) to authenticated;

select cron.alter_job(jobid, schedule := '* * * * *')
from cron.job
where jobname = 'verify-daily-puzzle';