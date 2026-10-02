#!/usr/bin/env bash
# Logical backup for Supabase Free (no automatic daily backups on free tier).
# Requires: supabase CLI logged in, or DATABASE_URL for pg_dump.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT_DIR="${BACKUP_DIR:-$ROOT/backups}"
mkdir -p "$OUT_DIR"
OUT_FILE="$OUT_DIR/phd-$STAMP.sql.gz"

if [[ -n "${DATABASE_URL:-}" ]]; then
  echo "Dumping via DATABASE_URL → $OUT_FILE"
  pg_dump "$DATABASE_URL" --no-owner --no-acl | gzip > "$OUT_FILE"
elif command -v supabase >/dev/null 2>&1; then
  echo "Dumping via supabase db dump → $OUT_FILE"
  supabase db dump --db-url "${SUPABASE_DB_URL:?Set SUPABASE_DB_URL}" | gzip > "$OUT_FILE"
else
  echo "Install supabase CLI or set DATABASE_URL for pg_dump." >&2
  exit 1
fi

echo "Wrote $OUT_FILE"
echo "Copy this file off-site (e.g. encrypted drive / Google Drive)."
