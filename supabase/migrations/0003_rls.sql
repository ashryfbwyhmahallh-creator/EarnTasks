alter table public.profiles enable row level security;
alter table public.wallets enable row level security;
alter table public.transactions enable row level security;
alter table public.cpalead_conversions enable row level security;
alter table public.withdrawals enable row level security;
alter table public.withdrawal_methods enable row level security;

create policy "profiles self select" on public.profiles
  for select using (auth.uid() = id or public.is_admin());
create policy "profiles self update" on public.profiles
  for update using (auth.uid() = id or public.is_admin())
  with check (auth.uid() = id or public.is_admin());

create policy "wallets self select" on public.wallets
  for select using (auth.uid() = user_id or public.is_admin());

create policy "tx self select" on public.transactions
  for select using (auth.uid() = user_id or public.is_admin());

create policy "conv self select" on public.cpalead_conversions
  for select using (auth.uid() = user_id or public.is_admin());

create policy "wd self select" on public.withdrawals
  for select using (auth.uid() = user_id or public.is_admin());

create policy "methods readable" on public.withdrawal_methods
  for select using (true);