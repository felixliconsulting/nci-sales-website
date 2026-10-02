-- Fix: ensure service_role can read/write all app tables (ingestion path).
-- Run this in Supabase SQL Editor if motivation save fails with permission denied.

grant usage on schema public to service_role;

grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select, update on all sequences in schema public to service_role;

alter default privileges in schema public
  grant select, insert, update, delete on tables to service_role;

alter default privileges in schema public
  grant usage, select, update on sequences to service_role;

-- Keep browser roles locked down for ingest tables
revoke insert, update, delete on public.raw_ingest_events from anon, authenticated;
revoke insert, update, delete on public.activity_sessions from anon, authenticated;
revoke insert, update, delete on public.sleep_daily from anon, authenticated;
revoke insert, update, delete on public.readiness_daily from anon, authenticated;
revoke insert, update, delete on public.daily_features from anon, authenticated;
revoke insert, update, delete on public.insight_snapshots from anon, authenticated;
revoke all on public.oauth_tokens from anon, authenticated;
