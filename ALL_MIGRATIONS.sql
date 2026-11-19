-- ===== 0001_core.sql =====
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

-- ===== 0002_functions.sql =====
-- Atomic wallet transaction: applies a single credit/debit and writes an immutable ledger row.
create or replace function public.apply_wallet_transaction(
  p_user_id uuid, p_type text, p_status text, p_points integer,
  p_reference text default null, p_description text default null
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_available integer; v_pending integer; v_tx_id uuid;
begin
  insert into public.wallets (user_id) values (p_user_id) on conflict (user_id) do nothing;
  select available_points, pending_points into v_available, v_pending
  from public.wallets where user_id = p_user_id for update;
  if p_status = 'available' then v_available := v_available + p_points;
  elsif p_status = 'pending' then v_pending := v_pending + p_points; end if;
  if v_available < 0 then raise exception 'Insufficient available points'; end if;
  if v_pending < 0 then raise exception 'Insufficient pending points'; end if;
  update public.wallets
    set available_points = v_available,
        pending_points = v_pending,
        total_earned_points = case when p_status = 'available' and p_points > 0
                                   then total_earned_points + p_points else total_earned_points end,
        updated_at = now()
  where user_id = p_user_id;
  insert into public.transactions (user_id, type, status, points, reference, description, balance_after)
  values (p_user_id, p_type, p_status, p_points, p_reference, p_description, v_available)
  returning id into v_tx_id;
  return jsonb_build_object('transaction_id', v_tx_id, 'available_points', v_available, 'pending_points', v_pending);
end;
$$;
-- Promote a pending ledger entry to available.
create or replace function public.confirm_pending_transaction(p_transaction_id uuid)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare v_user uuid; v_points integer; v_status text; v_available integer; v_pending integer;
begin
  select user_id, points, status into v_user, v_points, v_status
  from public.transactions where id = p_transaction_id for update;
  if v_user is null then raise exception 'Transaction not found'; end if;
  if v_status <> 'pending' then return jsonb_build_object('already', true); end if;
  update public.transactions set status = 'available' where id = p_transaction_id;
  update public.wallets
    set pending_points = pending_points - v_points,
        available_points = available_points + v_points,
        total_earned_points = total_earned_points + v_points,
        updated_at = now()
  where user_id = v_user
  returning available_points, pending_points into v_available, v_pending;
  return jsonb_build_object('available_points', v_available, 'pending_points', v_pending);
end;
$$;

revoke all on function public.apply_wallet_transaction from public, anon, authenticated;
revoke all on function public.confirm_pending_transaction from public, anon, authenticated;

create or replace function public.is_admin()
returns boolean language sql security definer set search_path = public stable
as $$ select coalesce((select is_admin from public.profiles where id = auth.uid()), false); $$;

-- ===== 0003_rls.sql =====
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

-- ===== 0004_payout_proofs.sql =====
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

-- ===== 0005_admin_audit_log.sql =====
create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles(id),
  action text not null,
  target_type text not null,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.admin_audit_log enable row level security;
create policy "admins read audit log" on public.admin_audit_log
  for select using (public.is_admin());

-- ===== 0006_seed_trigger.sql =====
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

-- ===== 0007_referrals_survey.sql =====
-- Referral tracking, creator metrics, and welcome survey (Tasks 1 & 2).
create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.profiles(id) on delete cascade,
  referred_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','active','rewarded','rejected')),
  source text,
  created_at timestamptz not null default now(),
  activated_at timestamptz,
  constraint referrals_no_self check (referrer_id <> referred_id),
  constraint referrals_unique_referred unique (referred_id)
);
create index if not exists idx_referrals_referrer on public.referrals(referrer_id, created_at desc);
create index if not exists idx_referrals_status on public.referrals(status);

create table if not exists public.welcome_survey_responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  question text not null default 'Do you use Facebook?',
  answer text not null check (answer in ('yes','no')),
  reward_points integer not null default 50,
  created_at timestamptz not null default now(),
  constraint welcome_survey_unique_user unique (user_id)
);
create index if not exists idx_welcome_survey_user on public.welcome_survey_responses(user_id);

-- Server-side RPC: claim the welcome survey reward exactly once per user.
create or replace function public.claim_welcome_survey(p_user_id uuid, p_answer text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_reward integer := 50;
  v_existing uuid;
  v_result jsonb;
begin
  if p_answer not in ('yes','no') then
    raise exception 'Invalid survey answer';
  end if;
  select id into v_existing from public.welcome_survey_responses where user_id = p_user_id;
  if v_existing is not null then
    return jsonb_build_object('already_claimed', true, 'reward_points', 0);
  end if;
  insert into public.welcome_survey_responses (user_id, answer, reward_points)
  values (p_user_id, p_answer, v_reward);
  select public.apply_wallet_transaction(p_user_id, 'ADMIN_ADJUSTMENT', 'available', v_reward, 'welcome_survey', 'Welcome survey reward') into v_result;
  return jsonb_build_object('already_claimed', false, 'reward_points', v_reward, 'wallet', v_result);
end;
$$;

revoke all on function public.claim_welcome_survey from public, anon, authenticated;

-- RLS: users can read their own referrals and survey response.
alter table public.referrals enable row level security;
alter table public.welcome_survey_responses enable row level security;
drop policy if exists referrals_select_own on public.referrals;
create policy referrals_select_own on public.referrals for select using (referrer_id = auth.uid() or referred_id = auth.uid());
drop policy if exists survey_select_own on public.welcome_survey_responses;
create policy survey_select_own on public.welcome_survey_responses for select using (user_id = auth.uid());


-- ===== 0008_withdrawal_requests.sql =====
-- Backfill: USDT withdrawal method + withdrawal_requests view (Task 1.3).
insert into public.withdrawal_methods (id, name, type, icon, currency_reward, minimum_points, required_fields, enabled, sort_order)
values ('usdt','USDT','cash','USDT','USDT (TRC20)',500,'[{"key":"wallet","label":"USDT Wallet Address (TRC20)","kind":"player_id"}]',true,6)
on conflict (id) do nothing;

-- Expose pending payout requests under the conventional name used by ops tooling.
create or replace view public.withdrawal_requests as
  select id, user_id, method, amount_points, amount_cents, destination, status, admin_note, created_at, processed_at
  from public.withdrawals;


-- ===== 0009_creator_and_commissions.sql =====
-- Creator flag + configurable commission split (Task 2 adjustments).

alter table public.profiles add column if not exists is_creator boolean not null default false;
create index if not exists idx_profiles_is_creator on public.profiles(is_creator);

-- Platform retains 30% of the raw offer value; users keep 70%.
-- Creator referrals: 50% of the referred user's EARNED POINTS (not platform profit).
-- Regular referrals: 20% of the referred user's EARNED POINTS.
create table if not exists public.platform_settings (
  key text primary key,
  value numeric not null,
  updated_at timestamptz not null default now()
);

insert into public.platform_settings (key, value) values
  ('platform_cut_percent', 30),
  ('user_reward_percent', 70),
  ('creator_commission_percent', 50),
  ('referral_commission_percent', 20)
on conflict (key) do update set value = excluded.value, updated_at = now();

-- Atomic conversion processor: locks the target wallet, credits the user,
-- and credits the referrer (creator 50% / regular 20%) in a single transaction.
create or replace function public.process_cpa_conversion(
  p_lead_id text,
  p_user_id uuid,
  p_payout_cents integer,
  p_reward_points integer,
  p_status text,
  p_campaign_id text default null,
  p_campaign_name text default null,
  p_country text default null,
  p_event_type text default null
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_referrer uuid;
  v_referrer_is_creator boolean := false;
  v_platform_cut integer := 30;
  v_creator_percent integer := 50;
  v_referral_percent integer := 20;
  v_referral_points integer := 0;
  v_commission_percent integer := 0;
  v_conv_id uuid;
  v_wallet jsonb;
begin
  -- Idempotency: one credit per lead_id.
  select id from public.cpalead_conversions where lead_id = p_lead_id;
  if found then
    return jsonb_build_object('duplicate', true, 'credited', false, 'points', 0);
  end if;

  select value into v_platform_cut from public.platform_settings where key = 'platform_cut_percent';
  select value into v_creator_percent from public.platform_settings where key = 'creator_commission_percent';
  select value into v_referral_percent from public.platform_settings where key = 'referral_commission_percent';

  select referred_by into v_referrer from public.profiles where id = p_user_id;
  if v_referrer is not null then
    select is_creator into v_referrer_is_creator from public.profiles where id = v_referrer;
    v_commission_percent := case when v_referrer_is_creator then coalesce(v_creator_percent,50)
                                 else coalesce(v_referral_percent,20) end;
    v_referral_points := floor((p_reward_points * v_commission_percent) / 100.0);
  end if;

  insert into public.cpalead_conversions
    (lead_id, user_id, campaign_id, campaign_name, payout_cents, reward_points, status, country, event_type, processed_at)
  values
    (p_lead_id, p_user_id, p_campaign_id, p_campaign_name, p_payout_cents, p_reward_points, p_status, p_country, p_event_type, now())
  returning id into v_conv_id;

  -- Credit the earning user.
  select public.apply_wallet_transaction(
    p_user_id, 'CPA_REWARD', case when p_status = 'confirmed' then 'available' else 'pending' end,
    p_reward_points, p_lead_id, 'CPAlead conversion'
  ) into v_wallet;

  -- Credit the referrer from the user's earned points (never from platform net).
  if p_status = 'confirmed' and v_referrer is not null and v_referral_points > 0 then
    perform public.apply_wallet_transaction(
      v_referrer, 'REFERRAL_REWARD', 'available',
      v_referral_points, 'ref:' || p_lead_id,
      'Referral commission (' || v_commission_percent || '% of referred earnings)'
    );
  end if;

  return jsonb_build_object(
    'duplicate', false,
    'credited', (p_status = 'confirmed'),
    'points', p_reward_points,
    'referral_points', v_referral_points,
    'commission_percent', v_commission_percent,
    'platform_cut_percent', v_platform_cut,
    'conversion_id', v_conv_id
  );
end;
$$;

revoke all on function public.process_cpa_conversion from public, anon, authenticated;


