-- Browser (authenticated) needs table GRANTs in addition to RLS policies.
-- Without these, Settings always looks "disconnected" even when rows exist.

grant usage on schema public to authenticated, anon;

-- Readable by signed-in user (RLS still restricts to own rows)
grant select on public.source_connections to authenticated;
grant select on public.raw_ingest_events to authenticated;
grant select on public.activity_sessions to authenticated;
grant select on public.sleep_daily to authenticated;
grant select on public.readiness_daily to authenticated;
grant select on public.motivation_checkins to authenticated;
grant select on public.daily_features to authenticated;
grant select on public.insight_snapshots to authenticated;

-- App form may upsert motivation as the signed-in user (also written via service role)
grant insert, update on public.motivation_checkins to authenticated;
grant insert, update on public.source_connections to authenticated;

-- Service role keeps full access for ingestion
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select, update on all sequences in schema public to service_role;
