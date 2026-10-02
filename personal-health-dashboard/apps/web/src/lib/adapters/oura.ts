import { encryptSecret, decryptSecret, sha256Hex } from "@/lib/crypto";
import { createServiceClient } from "@/lib/supabase/server";
import { refreshDailyFeaturesForDate } from "@/lib/ingest/motivation";

const OURA_AUTH = "https://cloud.ouraring.com/oauth/authorize";
const OURA_TOKEN = "https://api.ouraring.com/oauth/token";
const OURA_API = "https://api.ouraring.com/v2/usercollection";

export function ouraAuthorizeUrl(state: string): string {
  const clientId = process.env.OURA_CLIENT_ID!;
  const redirect = process.env.OURA_REDIRECT_URI!;
  const scopes = ["daily", "workout"].join(" ");
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirect,
    response_type: "code",
    scope: scopes,
    state,
  });
  return `${OURA_AUTH}?${params.toString()}`;
}

export async function exchangeOuraCode(code: string) {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: process.env.OURA_REDIRECT_URI!,
    client_id: process.env.OURA_CLIENT_ID!,
    client_secret: process.env.OURA_CLIENT_SECRET!,
  });
  const res = await fetch(OURA_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    throw new Error(`Oura token exchange failed: ${res.status}`);
  }
  return res.json() as Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
    scope?: string;
  }>;
}

export async function storeOuraTokens(
  userId: string,
  tokens: { access_token: string; refresh_token: string; expires_in: number; scope?: string },
) {
  const supabase = createServiceClient();
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
  const scopes = (tokens.scope || "daily workout").split(/\s+/).filter(Boolean);

  const { error: tokenError } = await supabase.from("oauth_tokens").upsert(
    {
      user_id: userId,
      source: "oura",
      access_token_encrypted: encryptSecret(tokens.access_token),
      refresh_token_encrypted: encryptSecret(tokens.refresh_token),
      expires_at: expiresAt,
      scopes,
    },
    { onConflict: "user_id,source" },
  );
  if (tokenError) throw new Error(`Failed to store Oura tokens: ${tokenError.message}`);

  const { error: connError } = await supabase.from("source_connections").upsert(
    {
      user_id: userId,
      source: "oura",
      status: "connected",
      scopes,
      last_error: null,
    },
    { onConflict: "user_id,source" },
  );
  if (connError) throw new Error(`Failed to store Oura connection: ${connError.message}`);
}

async function getValidAccessToken(userId: string): Promise<string> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("oauth_tokens")
    .select("*")
    .eq("user_id", userId)
    .eq("source", "oura")
    .single();
  if (error || !data) throw new Error("Oura not connected");

  const expiresAt = data.expires_at ? new Date(data.expires_at).getTime() : 0;
  if (expiresAt > Date.now() + 60_000) {
    return decryptSecret(data.access_token_encrypted);
  }

  const refresh = decryptSecret(data.refresh_token_encrypted);
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refresh,
    client_id: process.env.OURA_CLIENT_ID!,
    client_secret: process.env.OURA_CLIENT_SECRET!,
  });
  const res = await fetch(OURA_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    await supabase
      .from("source_connections")
      .update({ status: "expired", last_error: "Oura refresh failed" })
      .eq("user_id", userId)
      .eq("source", "oura");
    throw new Error("Oura token refresh failed");
  }
  const tokens = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };
  await storeOuraTokens(userId, {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token || refresh,
    expires_in: tokens.expires_in,
  });
  return tokens.access_token;
}

async function ouraGet(path: string, accessToken: string, query: Record<string, string>) {
  const url = new URL(`${OURA_API}/${path}`);
  Object.entries(query).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Oura API ${path} failed: ${res.status}`);
  }
  return res.json();
}

export async function syncOura(userId: string, daysBack = 30) {
  const accessToken = await getValidAccessToken(userId);
  const end = new Date();
  const start = new Date();
  start.setUTCDate(end.getUTCDate() - daysBack);
  const startStr = start.toISOString().slice(0, 10);
  const endStr = end.toISOString().slice(0, 10);
  const query = { start_date: startStr, end_date: endStr };

  const supabase = createServiceClient();
  const datesTouched = new Set<string>();

  try {
    // Fetch independently so one missing scope (e.g. workout 401) doesn't fail the whole sync.
    const settled = await Promise.allSettled([
      ouraGet("daily_sleep", accessToken, query),
      ouraGet("daily_readiness", accessToken, query),
      ouraGet("workout", accessToken, query),
    ]);
    const dailySleep =
      settled[0].status === "fulfilled" ? settled[0].value : { data: [] };
    const dailyReadiness =
      settled[1].status === "fulfilled" ? settled[1].value : { data: [] };
    const workouts =
      settled[2].status === "fulfilled" ? settled[2].value : { data: [] };
    const partialErrors = settled
      .filter((r): r is PromiseRejectedResult => r.status === "rejected")
      .map((r) => (r.reason instanceof Error ? r.reason.message : "request failed"));
    if (
      settled[0].status === "rejected" &&
      settled[1].status === "rejected" &&
      settled[2].status === "rejected"
    ) {
      throw new Error(partialErrors.join("; ") || "Oura sync failed");
    }

    for (const item of dailySleep?.data ?? []) {
      const checksum = sha256Hex(JSON.stringify(item));
      const { data: raw } = await supabase
        .from("raw_ingest_events")
        .upsert(
          {
            user_id: userId,
            source: "oura",
            external_id: item.id,
            payload: item,
            checksum,
            parser_version: "1",
            processing_status: "processed",
          },
          { onConflict: "user_id,source,checksum" },
        )
        .select("id")
        .maybeSingle();

      const sleepDate = item.day as string;
      datesTouched.add(sleepDate);
      await supabase.from("sleep_daily").upsert(
        {
          user_id: userId,
          source: "oura",
          external_id: item.id,
          sleep_date: sleepDate,
          total_sleep_sec: item.contributors?.total_sleep ?? item.total_sleep_duration ?? null,
          time_in_bed_sec: item.contributors?.total_sleep ?? null,
          efficiency: item.contributors?.efficiency ?? null,
          score: item.score ?? null,
          resting_hr: null,
          hrv: null,
          raw_event_id: raw?.id ?? null,
        },
        { onConflict: "user_id,source,sleep_date" },
      );
    }

    for (const item of dailyReadiness?.data ?? []) {
      const checksum = sha256Hex(JSON.stringify(item));
      await supabase.from("raw_ingest_events").upsert(
        {
          user_id: userId,
          source: "oura",
          external_id: item.id,
          payload: item,
          checksum,
          parser_version: "1",
          processing_status: "processed",
        },
        { onConflict: "user_id,source,checksum" },
      );
      const localDate = item.day as string;
      datesTouched.add(localDate);
      await supabase.from("readiness_daily").upsert(
        {
          user_id: userId,
          source: "oura",
          external_id: item.id,
          local_date: localDate,
          readiness: item.score ?? null,
          body_battery: null,
          stress: null,
        },
        { onConflict: "user_id,source,local_date" },
      );
    }

    for (const item of workouts?.data ?? []) {
      const checksum = sha256Hex(JSON.stringify(item));
      await supabase.from("raw_ingest_events").upsert(
        {
          user_id: userId,
          source: "oura",
          external_id: item.id,
          payload: item,
          checksum,
          parser_version: "1",
          processing_status: "processed",
        },
        { onConflict: "user_id,source,checksum" },
      );
      const started = item.start_datetime || item.day;
      const localDate = (item.day as string) || String(started).slice(0, 10);
      datesTouched.add(localDate);
      await supabase.from("activity_sessions").upsert(
        {
          user_id: userId,
          source: "oura",
          external_id: item.id,
          started_at_utc: item.start_datetime || `${localDate}T12:00:00Z`,
          local_date: localDate,
          sport: item.activity || item.type || "workout",
          duration_sec: item.duration ?? null,
          distance_m: item.distance ?? null,
          avg_hr: item.average_heart_rate ?? null,
          max_hr: item.max_heart_rate ?? null,
          training_load: item.calories ?? null,
        },
        { onConflict: "user_id,source,external_id" },
      );
    }

    for (const d of datesTouched) {
      await refreshDailyFeaturesForDate(userId, d);
    }

    const { error: syncStatusError } = await supabase
      .from("source_connections")
      .upsert(
        {
          user_id: userId,
          source: "oura",
          status: "connected",
          last_sync_at: new Date().toISOString(),
          last_error: partialErrors.length ? partialErrors.join("; ") : null,
        },
        { onConflict: "user_id,source" },
      );
    if (syncStatusError) {
      throw new Error(`Failed to update Oura sync status: ${syncStatusError.message}`);
    }

    return { ok: true as const, days: datesTouched.size, warnings: partialErrors };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Oura sync failed";
    await supabase
      .from("source_connections")
      .update({ status: "error", last_error: message })
      .eq("user_id", userId)
      .eq("source", "oura");
    throw err;
  }
}
