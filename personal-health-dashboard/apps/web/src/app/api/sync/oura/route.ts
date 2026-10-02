import { NextResponse } from "next/server";
import { authorizeBotToken, dashboardUserId } from "@/lib/auth/bot";
import { createClient } from "@/lib/supabase/server";
import { syncOura } from "@/lib/adapters/oura";

export async function POST(request: Request) {
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

  try {
    const result = await syncOura(userId, 30);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    console.error("oura sync error", message);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
