# Motivation check-in contract

**Status:** frozen for at least 60 days from first production check-in  
**Timezone:** America/Vancouver unless travel is recorded  
**Owner:** Felix

## Fields

| Field | Type | Rules |
| --- | --- | --- |
| `motivation` | integer | 1–10, required |
| `energy` | integer | 1–10, required |
| `soreness` | integer | 1–10, required |
| `confidence` | integer | 1–10, required |
| `note` | string | free text, optional, max 4000 chars |
| `tags` | string[] | optional subset of allowed tags |
| `asked_at` | ISO-8601 datetime | when the bot asked |
| `answered_at` | ISO-8601 datetime | when Felix answered |
| `local_date` | `YYYY-MM-DD` | calendar date in America/Vancouver |
| `capture_source` | string | `grokbot` \| `app` \| `craft` |

## Allowed tags

- `illness`
- `injury`
- `travel`
- `race`
- `unusual_stress`

## Upsert rule

One check-in per `(user_id, local_date)`. Re-submitting the same local date updates the existing row and appends a new `raw_ingest_events` record.

## Example payload

```json
{
  "motivation": 7,
  "energy": 6,
  "soreness": 4,
  "confidence": 7,
  "note": "Legs a bit heavy after yesterday's intervals.",
  "tags": ["unusual_stress"],
  "asked_at": "2026-10-02T07:05:00-07:00",
  "answered_at": "2026-10-02T07:07:12-07:00",
  "local_date": "2026-10-02",
  "capture_source": "grokbot"
}
```

## Scale anchors (for the bot to remind Felix)

1 = very low / severe · 5 = typical · 10 = excellent / none (for soreness: 1 = none, 10 = severe)
