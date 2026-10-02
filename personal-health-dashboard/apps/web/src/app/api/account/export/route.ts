import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = createServiceClient();
  const tables = [
    "motivation_checkins",
    "sleep_daily",
    "readiness_daily",
    "activity_sessions",
    "daily_features",
    "insight_snapshots",
    "source_connections",
  ] as const;

  const exportPayload: Record<string, unknown> = {
    exported_at: new Date().toISOString(),
    user_id: user.id,
  };

  for (const table of tables) {
    const { data } = await db.from(table).select("*").eq("user_id", user.id);
    exportPayload[table] = data ?? [];
  }

  return new NextResponse(JSON.stringify(exportPayload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="phd-export-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
