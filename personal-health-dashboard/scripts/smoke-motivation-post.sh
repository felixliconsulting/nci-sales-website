#!/usr/bin/env bash
# Smoke-test the write-only motivation ingest endpoint.
set -euo pipefail

BASE_URL="${APP_BASE_URL:-http://localhost:3000}"
TOKEN="${MOTIVATION_INGEST_TOKEN:?Set MOTIVATION_INGEST_TOKEN}"
LOCAL_DATE="${LOCAL_DATE:-$(TZ=America/Vancouver date +%F)}"

curl -sS -w "\nHTTP %{http_code}\n" -X POST "$BASE_URL/api/ingest/motivation" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"motivation\": 7,
    \"energy\": 6,
    \"soreness\": 3,
    \"confidence\": 7,
    \"note\": \"smoke test\",
    \"tags\": [],
    \"asked_at\": \"${LOCAL_DATE}T07:00:00-07:00\",
    \"answered_at\": \"${LOCAL_DATE}T07:02:00-07:00\",
    \"local_date\": \"$LOCAL_DATE\",
    \"capture_source\": \"grokbot\"
  }"
