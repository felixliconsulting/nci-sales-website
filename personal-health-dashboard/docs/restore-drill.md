# Restore drill checklist

1. Run `./scripts/backup.sh` with `DATABASE_URL` or `SUPABASE_DB_URL` set.
2. Copy the gzipped dump off-site.
3. Create a temporary Supabase project (or local Postgres).
4. Run `./scripts/restore.sh backups/phd-….sql.gz` against that target.
5. Confirm row counts for `motivation_checkins`, `sleep_daily`, `activity_sessions`.
6. Record date of successful restore in your ops notes.
