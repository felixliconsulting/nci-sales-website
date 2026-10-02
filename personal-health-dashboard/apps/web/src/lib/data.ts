import { createClient } from "@/lib/supabase/server";
import { localDateInAppTz } from "@/lib/crypto";

export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function loadTodayBundle(userId: string) {
  const supabase = await createClient();
  const today = localDateInAppTz();
  const yesterday = shift(today, -1);

  const [
    { data: sleep },
    { data: readiness },
    { data: activities },
    { data: checkin },
    { data: connections },
  ] = await Promise.all([
    supabase
      .from("sleep_daily")
      .select("*")
      .eq("user_id", userId)
      .eq("sleep_date", today)
      .order("source")
      .limit(1)
      .maybeSingle(),
    supabase
      .from("readiness_daily")
      .select("*")
      .eq("user_id", userId)
      .eq("local_date", today)
      .limit(1)
      .maybeSingle(),
    supabase
      .from("activity_sessions")
      .select("*")
      .eq("user_id", userId)
      .gte("local_date", shift(today, -2))
      .order("started_at_utc", { ascending: false })
      .limit(5),
    supabase
      .from("motivation_checkins")
      .select("*")
      .eq("user_id", userId)
      .eq("local_date", today)
      .maybeSingle(),
    supabase.from("source_connections").select("*").eq("user_id", userId),
  ]);

  return {
    today,
    yesterday,
    sleep,
    readiness,
    activities: activities ?? [],
    checkin,
    connections: connections ?? [],
  };
}

export async function loadFeatures(userId: string, days = 30) {
  const supabase = await createClient();
  const start = shift(localDateInAppTz(), -(days - 1));
  const { data } = await supabase
    .from("daily_features")
    .select("*")
    .eq("user_id", userId)
    .gte("local_date", start)
    .order("local_date", { ascending: true });
  return data ?? [];
}

function shift(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function hoursFromSec(sec: number | null | undefined): string {
  if (sec == null) return "—";
  return `${(sec / 3600).toFixed(1)}h`;
}

export function freshnessLabel(iso: string | null | undefined): string {
  if (!iso) return "never synced";
  const ms = Date.now() - new Date(iso).getTime();
  const hours = Math.round(ms / 3_600_000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}
