import { createServiceClient } from "@/lib/supabase/server";
import { sha256Hex } from "@/lib/crypto";
import type { MotivationIngestInput } from "./motivation-schema";

export async function upsertMotivationCheckin(
  userId: string,
  input: MotivationIngestInput,
) {
  const supabase = createServiceClient();
  const checksum = sha256Hex(JSON.stringify(input));

  const { data: existingRaw } = await supabase
    .from("raw_ingest_events")
    .select("id")
    .eq("user_id", userId)
    .eq("source", "motivation")
    .eq("checksum", checksum)
    .maybeSingle();

  let rawEventId = existingRaw?.id as string | undefined;

  if (!rawEventId) {
    const { data: raw, error: rawError } = await supabase
      .from("raw_ingest_events")
      .insert({
        user_id: userId,
        source: "motivation",
        external_id: `${input.local_date}:${input.capture_source}`,
        payload: input,
        checksum,
        parser_version: "1",
        processing_status: "pending",
      })
      .select("id")
      .single();

    if (rawError) throw rawError;
    rawEventId = raw.id;
  }

  const row = {
    user_id: userId,
    local_date: input.local_date,
    motivation: input.motivation,
    energy: input.energy,
    soreness: input.soreness,
    confidence: input.confidence,
    note: input.note ?? null,
    tags: input.tags ?? [],
    asked_at: input.asked_at ?? null,
    answered_at: input.answered_at ?? new Date().toISOString(),
    capture_source: input.capture_source,
  };

  const { data: checkin, error } = await supabase
    .from("motivation_checkins")
    .upsert(row, { onConflict: "user_id,local_date" })
    .select("*")
    .single();

  if (error) throw error;

  await supabase
    .from("raw_ingest_events")
    .update({ processing_status: "processed" })
    .eq("id", rawEventId);

  await supabase.from("source_connections").upsert(
    {
      user_id: userId,
      source: "motivation",
      status: "connected",
      last_sync_at: new Date().toISOString(),
      last_error: null,
    },
    { onConflict: "user_id,source" },
  );

  await refreshDailyFeaturesForDate(userId, input.local_date);

  return checkin;
}

export async function refreshDailyFeaturesForDate(userId: string, localDate: string) {
  const supabase = createServiceClient();

  const [{ data: sleep }, { data: readiness }, { data: activities }, { data: motivation }] =
    await Promise.all([
      supabase
        .from("sleep_daily")
        .select("*")
        .eq("user_id", userId)
        .eq("sleep_date", localDate)
        .maybeSingle(),
      supabase
        .from("readiness_daily")
        .select("*")
        .eq("user_id", userId)
        .eq("local_date", localDate)
        .maybeSingle(),
      supabase
        .from("activity_sessions")
        .select("training_load,duration_sec")
        .eq("user_id", userId)
        .eq("local_date", localDate),
      supabase
        .from("motivation_checkins")
        .select("*")
        .eq("user_id", userId)
        .eq("local_date", localDate)
        .maybeSingle(),
    ]);

  const prevDate = shiftDate(localDate, -1);
  const [{ data: prevSleep }, { data: prevActivities }] = await Promise.all([
    supabase
      .from("sleep_daily")
      .select("total_sleep_sec")
      .eq("user_id", userId)
      .eq("sleep_date", prevDate)
      .maybeSingle(),
    supabase
      .from("activity_sessions")
      .select("training_load")
      .eq("user_id", userId)
      .eq("local_date", prevDate),
  ]);

  const activityLoad = (activities ?? []).reduce(
    (sum, a) => sum + (Number(a.training_load) || 0),
    0,
  );
  const activityDuration = (activities ?? []).reduce(
    (sum, a) => sum + (Number(a.duration_sec) || 0),
    0,
  );
  const prevLoad = (prevActivities ?? []).reduce(
    (sum, a) => sum + (Number(a.training_load) || 0),
    0,
  );

  const weekday = new Date(`${localDate}T12:00:00Z`).getUTCDay();

  await supabase.from("daily_features").upsert(
    {
      user_id: userId,
      local_date: localDate,
      has_sleep: Boolean(sleep),
      has_readiness: Boolean(readiness),
      has_activity: (activities?.length ?? 0) > 0,
      has_motivation: Boolean(motivation),
      sleep_total_sec: sleep?.total_sleep_sec ?? null,
      sleep_efficiency: sleep?.efficiency ?? null,
      sleep_score: sleep?.score ?? null,
      sleep_hrv: sleep?.hrv ?? null,
      readiness: readiness?.readiness ?? null,
      activity_load: activityLoad || null,
      activity_duration_sec: activityDuration || null,
      motivation: motivation?.motivation ?? null,
      energy: motivation?.energy ?? null,
      soreness: motivation?.soreness ?? null,
      confidence: motivation?.confidence ?? null,
      prev_sleep_total_sec: prevSleep?.total_sleep_sec ?? null,
      prev_activity_load: prevLoad || null,
      weekday,
      tags: motivation?.tags ?? [],
    },
    { onConflict: "user_id,local_date" },
  );
}

function shiftDate(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
