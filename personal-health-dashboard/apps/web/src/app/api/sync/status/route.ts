import { NextResponse } from "next/server";
import { authorizeBotToken, dashboardUserId } from "@/lib/auth/bot";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const botOk = authorizeBotToken(request, "SYNC_BOT_TOKEN") ||
    authorizeBotToken(request, "MOTIVATION_INGEST_TOKEN");

  let userId: string | null = null;
  if (botOk) {
    userId = dashboardUserId();
  } else {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    userId = user.id;
  }

  const db = createServiceClient();
  const { data: connections } = await db
    .from("source_connections")
    .select("source,status,last_sync_at,last_error,scopes")
    .eq("user_id", userId);

  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 14);
  const sinceStr = since.toISOString().slice(0, 10);

  const [{ count: motivationDays }, { count: sleepDays }] = await Promise.all([
    db
      .from("motivation_checkins")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("local_date", sinceStr),
    db
      .from("sleep_daily")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("sleep_date", sinceStr),
  ]);

  return NextResponse.json({
    connections: connections ?? [],
    last_14_days: {
      motivation_checkins: motivationDays ?? 0,
      sleep_days: sleepDays ?? 0,
    },
    note: "Freshness summary only — no health row payloads.",
  });
}
