import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { confirm?: string };
  if (body.confirm !== "DELETE") {
    return NextResponse.json(
      { error: 'Send {"confirm":"DELETE"} to proceed' },
      { status: 400 },
    );
  }

  const db = createServiceClient();
  const tables = [
    "insight_snapshots",
    "daily_features",
    "motivation_checkins",
    "activity_sessions",
    "sleep_daily",
    "readiness_daily",
    "raw_ingest_events",
    "oauth_tokens",
    "source_connections",
  ];

  for (const table of tables) {
    const { error } = await db.from(table).delete().eq("user_id", user.id);
    if (error) {
      console.error("delete failed", table, error.message);
      return NextResponse.json({ error: "Delete incomplete" }, { status: 500 });
    }
  }

  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
