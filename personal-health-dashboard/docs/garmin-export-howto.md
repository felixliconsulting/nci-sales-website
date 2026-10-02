# Garmin export howto (v1 sanctioned path)

Do **not** store a Garmin username/password in this app. Do **not** use unofficial Connect scrapers.

## Why export instead of API

Garmin’s Connect Developer Program is for business use and currently may pause new API approvals. V1 uses Garmin’s supported export formats behind a single `GarminAdapter`.

## What to export

### A. Activity list CSV (fastest for training log)

1. Open [Garmin Connect](https://connect.garmin.com) on the web.
2. Go to **Activities**.
3. Scroll until the date range you need is loaded.
4. Use **Export CSV**.
5. Upload that file in the app under **Data health → Garmin import**.

### B. Individual activity FIT (more detail)

1. Open an activity in Garmin Connect.
2. Export as **FIT**.
3. Upload one or more `.fit` files in the app.

### C. Full account export (sleep / wellness JSON)

1. Garmin Connect → account settings → **Export Your Data**.
2. Wait for the email download link.
3. Unzip and upload the ZIP (or the wellness JSON files under `DI_CONNECT/DI-Connect-Wellness/`).

## Re-import rule

Imports are checksum-deduped. Re-uploading the same file is safe and will not create duplicate activity or sleep rows.

## After import

Check **Data health** for:

- last successful Garmin ingest time
- number of new vs skipped (duplicate) records
- any parser errors (without secrets)
