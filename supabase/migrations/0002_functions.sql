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