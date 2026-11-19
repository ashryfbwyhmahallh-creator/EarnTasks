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
