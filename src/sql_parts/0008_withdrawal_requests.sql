-- Backfill: USDT withdrawal method + withdrawal_requests view (Task 1.3).
insert into public.withdrawal_methods (id, name, type, icon, currency_reward, minimum_points, required_fields, enabled, sort_order)
values ('usdt','USDT','cash','USDT','USDT (TRC20)',500,'[{"key":"wallet","label":"USDT Wallet Address (TRC20)","kind":"player_id"}]',true,6)
on conflict (id) do nothing;

-- Expose pending payout requests under the conventional name used by ops tooling.
create or replace view public.withdrawal_requests as
  select id, user_id, method, amount_points, amount_cents, destination, status, admin_note, created_at, processed_at
  from public.withdrawals;
