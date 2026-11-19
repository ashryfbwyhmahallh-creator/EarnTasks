-- EarnTasks core schema. Points are integers (100 Points = $1.00). Money stored as integer cents.
create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  username text,
  referral_code text not null unique,
  referred_by uuid references public.profiles(id),
  country text,
  is_admin boolean not null default false,
  is_blocked boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_profiles_ref_code on public.profiles(referral_code);
create index if not exists idx_profiles_referred_by on public.profiles(referred_by);

create table if not exists public.wallets (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  available_points integer not null default 0 check (available_points >= 0),
  pending_points integer not null default 0 check (pending_points >= 0),
  total_earned_points integer not null default 0 check (total_earned_points >= 0),
  updated_at timestamptz not null default now()
);
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('CPA_REWARD','REFERRAL_REWARD','WITHDRAWAL','WITHDRAWAL_REVERSAL','ADMIN_ADJUSTMENT')),
  status text not null default 'available' check (status in ('pending','available','reversed','cancelled')),
  points integer not null,
  reference text,
  description text,
  balance_after integer,
  created_at timestamptz not null default now()
);
create index if not exists idx_tx_user on public.transactions(user_id, created_at desc);
create index if not exists idx_tx_reference on public.transactions(reference);

create table if not exists public.cpalead_conversions (
  id uuid primary key default gen_random_uuid(),
  lead_id text not null unique,
  user_id uuid not null references public.profiles(id) on delete cascade,
  campaign_id text,
  campaign_name text,
  payout_cents integer not null check (payout_cents >= 0),
  reward_points integer not null check (reward_points >= 0),
  status text not null default 'confirmed',
  country text,
  event_type text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);
create index if not exists idx_conv_user on public.cpalead_conversions(user_id);
create index if not exists idx_conv_created on public.cpalead_conversions(created_at desc);
create table if not exists public.withdrawals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  method text not null,
  amount_points integer not null check (amount_points > 0),
  amount_cents integer not null check (amount_cents > 0),
  destination jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending','processing','paid','rejected','cancelled')),
  admin_note text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);
create index if not exists idx_wd_user on public.withdrawals(user_id, created_at desc);
create index if not exists idx_wd_status on public.withdrawals(status);

create table if not exists public.withdrawal_methods (
  id text primary key,
  name text not null,
  type text not null check (type in ('game','cash')),
  icon text not null,
  currency_reward text not null,
  minimum_points integer not null check (minimum_points > 0),
  required_fields jsonb not null default '[]'::jsonb,
  enabled boolean not null default true,
  sort_order integer not null default 0
);

insert into public.withdrawal_methods (id, name, type, icon, currency_reward, minimum_points, required_fields, enabled, sort_order)
values
  ('fc_mobile','FC Mobile','game','FC','FC Points',100,'[{"key":"player_id","label":"FC Mobile Player/User ID","kind":"player_id"}]',true,1),
  ('efootball','eFootball','game','EF','eFootball Coins',200,'[{"key":"player_id","label":"eFootball User ID","kind":"player_id"}]',true,2),
  ('pubg_mobile','PUBG Mobile','game','PB','UC',100,'[{"key":"player_id","label":"PUBG Mobile Player ID","kind":"player_id"}]',true,3),
  ('free_fire','Free Fire','game','FF','Diamonds',100,'[{"key":"player_id","label":"Free Fire Player ID","kind":"player_id"}]',true,4),
  ('paypal','PayPal','cash','PP','PayPal',500,'[{"key":"email","label":"PayPal email","kind":"email"}]',true,5)
on conflict (id) do nothing;