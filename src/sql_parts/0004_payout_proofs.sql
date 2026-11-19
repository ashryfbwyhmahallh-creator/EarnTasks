create table if not exists public.payout_proofs (
  id uuid primary key default gen_random_uuid(),
  withdrawal_id uuid not null unique references public.withdrawals(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  phone_number text not null,
  proof_url text not null,
  note text,
  status text not null default 'submitted' check (status in ('submitted','reviewed','approved','rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
alter table public.payout_proofs enable row level security;
create policy "users read own proofs" on public.payout_proofs
  for select using (auth.uid() = user_id or public.is_admin());
create policy "users insert own proofs" on public.payout_proofs
  for insert with check (auth.uid() = user_id);
create policy "users update own proofs" on public.payout_proofs
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "admins update proofs" on public.payout_proofs
  for update using (public.is_admin());