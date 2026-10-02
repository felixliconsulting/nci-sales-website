# Deploy on free tiers (Vercel Hobby + Supabase Free)

1. Create a Supabase Free project in a region close to you.
2. SQL Editor → run [`supabase/migrations/20261002000000_init.sql`](../supabase/migrations/20261002000000_init.sql).
3. Auth settings: disable open signup; invite only Felix; enable MFA.
4. Copy user UUID into `DASHBOARD_USER_ID`.
5. Create Oura application at https://cloud.ouraring.com/ → scopes `daily`, `workout`.
6. Push this repo to GitHub (new private repo recommended).
7. Import into Vercel Hobby; set Root carefully:
   - Option A: set project root to `apps/web` and install there.
   - Option B: use repo-root `vercel.json`.
8. Add all env vars from [`.env.example`](../.env.example).
9. Deploy → open HTTPS URL → sign in → Connect Oura → install PWA from phone Share/Add to Home Screen.
10. Paste [`docs/grokbot-agent-handoff.md`](grokbot-agent-handoff.md) to your Grokbot agent.
11. Run `./scripts/backup.sh` once and store the dump off-site; then `./scripts/restore.sh` against a throwaway DB.

## Cost

$0 on Vercel Hobby + Supabase Free for a single-user prototype. Upgrade Supabase to Pro only when you want automatic backups and no inactivity pausing.
