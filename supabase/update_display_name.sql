create or replace function public.update_my_display_name(p_display_name text)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_profile public.profiles;
  cleaned_name text := trim(coalesce(p_display_name, ''));
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if cleaned_name = '' or char_length(cleaned_name) > 40 then
    raise exception 'Display name must be between 1 and 40 characters';
  end if;

  insert into public.profiles (id, display_name)
  values (auth.uid(), cleaned_name)
  on conflict (id) do update set display_name = excluded.display_name, updated_at = now();

  select * into updated_profile from public.profiles where id = auth.uid();
  return updated_profile;
end;
$$;

revoke all on function public.update_my_display_name(text) from public;
grant execute on function public.update_my_display_name(text) to authenticated;
