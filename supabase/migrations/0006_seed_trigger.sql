create or replace function public.handle_new_profile()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.wallets (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;
drop trigger if exists trg_new_profile_wallet on public.profiles;
create trigger trg_new_profile_wallet
  after insert on public.profiles
  for each row execute function public.handle_new_profile();