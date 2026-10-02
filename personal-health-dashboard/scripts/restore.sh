#!/usr/bin/env bash
# Restore drill — apply a gzipped SQL dump to a target database.
# Prefer restoring into a throwaway Supabase branch/project first.
set -euo pipefail

DUMP_FILE="${1:-}"
if [[ -z "$DUMP_FILE" || ! -f "$DUMP_FILE" ]]; then
  echo "Usage: $0 path/to/phd-YYYYMMDD.sql.gz" >&2
  exit 1
fi

: "${DATABASE_URL:?Set DATABASE_URL to the restore target}"

echo "Restoring $DUMP_FILE into DATABASE_URL (this overwrites objects in that DB)."
gunzip -c "$DUMP_FILE" | psql "$DATABASE_URL"
echo "Restore finished. Spot-check motivation_checkins and sleep_daily counts."
