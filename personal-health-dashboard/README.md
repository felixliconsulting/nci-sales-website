# Personal Health + Motivation Dashboard

Private, mobile-first Next.js Progressive Web App backed by Supabase. Combines Oura sleep/readiness, Garmin activity exports, and one daily motivation check-in. Not a medical device.

> **Repo note:** This project was scaffolded as `personal-health-dashboard/` for delivery. Prefer extracting it to its own private GitHub repo (`felixliconsulting/personal-health-dashboard`) rather than merging into the NCI Sales site long-term.

## Stack

- **App:** Next.js (App Router) + TypeScript + PWA — free on Vercel Hobby
- **Data:** Supabase Free (Postgres, Auth, RLS, Storage)
- **Timezone:** America/Vancouver

## Repo layout

```text
apps/web/          Next.js PWA
supabase/          Migrations + seed notes
scripts/           Backup, restore, smoke tests
docs/              Contracts + Grokbot handoff
```

## Quick start

```bash
cd apps/web
cp ../../.env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Required setup (one-time)

1. Create a free Supabase project.
2. Run SQL in `supabase/migrations/` (in order) via the SQL editor or CLI.
3. Disable open signup; invite only your account; enable MFA.
4. Copy project URL + anon key + service role key into `.env.local` / Vercel env.
5. Generate a long random `MOTIVATION_INGEST_TOKEN` and `SYNC_BOT_TOKEN`.
6. Deploy `apps/web` to Vercel Hobby (HTTPS).
7. Connect Oura under **Settings** in the app.
8. Give Grokbot the copy-paste brief in [`docs/grokbot-agent-handoff.md`](docs/grokbot-agent-handoff.md).

## Scripts

```bash
./scripts/backup.sh      # logical pg_dump / supabase db dump
./scripts/restore.sh     # restore drill
./scripts/smoke-motivation-post.sh
```

## License

Private personal project. Not for redistribution as a medical product.
