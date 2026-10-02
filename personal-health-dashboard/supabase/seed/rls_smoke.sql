-- Manual RLS verification (run as anon / wrong user in SQL editor carefully)
-- Expect: zero rows for signed-out / wrong-user selects on health tables.

-- As authenticated Felix (via app): should see only own rows.
-- As anon key without JWT: selects should return empty due to RLS.

select count(*) as should_be_zero from public.motivation_checkins;
select count(*) as should_be_zero from public.sleep_daily;
select count(*) as should_be_zero from public.activity_sessions;
select count(*) as should_be_zero from public.oauth_tokens; -- should error or empty; no grants for anon
