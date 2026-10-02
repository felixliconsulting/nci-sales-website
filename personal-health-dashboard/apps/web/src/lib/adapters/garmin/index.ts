import { createServiceClient } from "@/lib/supabase/server";
import { sha256Hex } from "@/lib/crypto";
import { refreshDailyFeaturesForDate } from "@/lib/ingest/motivation";
import { GarminExportAdapter } from "./export";
import type { GarminAdapter } from "./types";

export function getGarminAdapter(kind: "export" | "official" = "export"): GarminAdapter {
  if (kind === "official") {
    // Lazy import keeps export path default.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { GarminOfficialAdapter } = require("./official") as typeof import("./official");
    return new GarminOfficialAdapter();
  }
  return new GarminExportAdapter();
}

export async function persistGarminImport(
  userId: string,
  filename: string,
  content: Buffer,
) {
  const adapter = getGarminAdapter("export");
  const result = await adapter.importPayload({ filename, content });
  const supabase = createServiceClient();
  let inserted = 0;
  let skipped = 0;
  const dates = new Set<string>();

  for (const activity of result.activities) {
    const checksum = sha256Hex(JSON.stringify(activity.raw));
    const { data: existing } = await supabase
      .from("raw_ingest_events")
      .select("id")
      .eq("user_id", userId)
      .eq("source", "garmin")
      .eq("checksum", checksum)
      .maybeSingle();
    if (existing) {
      skipped += 1;
      continue;
    }
    const { data: raw } = await supabase
      .from("raw_ingest_events")
      .insert({
        user_id: userId,
        source: "garmin",
        external_id: activity.external_id,
        payload: activity.raw,
        checksum,
        parser_version: result.parserVersion,
        processing_status: "processed",
      })
      .select("id")
      .single();

    const { error } = await supabase.from("activity_sessions").upsert(
      {
        user_id: userId,
        source: "garmin",
        external_id: activity.external_id,
        started_at_utc: activity.started_at_utc,
        local_date: activity.local_date,
        sport: activity.sport,
        duration_sec: activity.duration_sec,
        distance_m: activity.distance_m,
        pace_sec_per_km: activity.pace_sec_per_km,
        elevation_m: activity.elevation_m,
        avg_hr: activity.avg_hr,
        max_hr: activity.max_hr,
        training_load: activity.training_load,
        raw_event_id: raw?.id ?? null,
      },
      { onConflict: "user_id,source,external_id" },
    );
    if (!error) {
      inserted += 1;
      dates.add(activity.local_date);
    }
  }

  for (const sleep of result.sleep) {
    const checksum = sha256Hex(JSON.stringify(sleep.raw));
    const { data: existing } = await supabase
      .from("raw_ingest_events")
      .select("id")
      .eq("user_id", userId)
      .eq("source", "garmin")
      .eq("checksum", checksum)
      .maybeSingle();
    if (existing) {
      skipped += 1;
      continue;
    }
    await supabase.from("raw_ingest_events").insert({
      user_id: userId,
      source: "garmin",
      external_id: sleep.external_id,
      payload: sleep.raw,
      checksum,
      parser_version: result.parserVersion,
      processing_status: "processed",
    });
    await supabase.from("sleep_daily").upsert(
      {
        user_id: userId,
        source: "garmin",
        external_id: sleep.external_id,
        sleep_date: sleep.sleep_date,
        total_sleep_sec: sleep.total_sleep_sec,
        time_in_bed_sec: sleep.time_in_bed_sec,
        efficiency: sleep.efficiency,
        score: sleep.score,
        resting_hr: sleep.resting_hr,
        hrv: sleep.hrv,
      },
      { onConflict: "user_id,source,sleep_date" },
    );
    inserted += 1;
    dates.add(sleep.sleep_date);
  }

  for (const readiness of result.readiness) {
    const checksum = sha256Hex(JSON.stringify(readiness.raw));
    const { data: existing } = await supabase
      .from("raw_ingest_events")
      .select("id")
      .eq("user_id", userId)
      .eq("source", "garmin")
      .eq("checksum", checksum)
      .maybeSingle();
    if (existing) {
      skipped += 1;
      continue;
    }
    await supabase.from("raw_ingest_events").insert({
      user_id: userId,
      source: "garmin",
      external_id: readiness.external_id,
      payload: readiness.raw,
      checksum,
      parser_version: result.parserVersion,
      processing_status: "processed",
    });
    await supabase.from("readiness_daily").upsert(
      {
        user_id: userId,
        source: "garmin",
        external_id: readiness.external_id,
        local_date: readiness.local_date,
        readiness: readiness.readiness,
        body_battery: readiness.body_battery,
        stress: readiness.stress,
      },
      { onConflict: "user_id,source,local_date" },
    );
    inserted += 1;
    dates.add(readiness.local_date);
  }

  for (const d of dates) {
    await refreshDailyFeaturesForDate(userId, d);
  }

  await supabase.from("source_connections").upsert(
    {
      user_id: userId,
      source: "garmin",
      status: "connected",
      last_sync_at: new Date().toISOString(),
      last_error: null,
      metadata: { last_filename: filename, inserted, skipped },
    },
    { onConflict: "user_id,source" },
  );

  return { inserted, skipped, dates: [...dates] };
}
