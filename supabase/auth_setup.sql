create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  user_full_name text := coalesce(nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''), '');
  user_station_name text := coalesce(nullif(btrim(new.raw_user_meta_data ->> 'station_name'), ''), 'My Station');
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, coalesce(new.email, ''), user_full_name, 'manager')
  on conflict (id) do update
    set email = excluded.email,
        full_name = excluded.full_name;

  insert into public.workspaces (
    owner_user_id,
    station_name,
    station_location,
    omc_brand,
    manager_name,
    currency_symbol
  )
  values (
    new.id,
    user_station_name,
    '',
    'Onyxma Energy',
    user_full_name,
    'GHS'
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();
