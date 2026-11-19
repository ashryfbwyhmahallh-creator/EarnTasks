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
