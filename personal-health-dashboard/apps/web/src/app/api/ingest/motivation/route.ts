import { NextResponse } from "next/server";
import { authorizeBotToken, dashboardUserId } from "@/lib/auth/bot";
import { motivationIngestSchema } from "@/lib/ingest/motivation-schema";
import { upsertMotivationCheckin } from "@/lib/ingest/motivation";

export async function POST(request: Request) {
  if (!authorizeBotToken(request, "MOTIVATION_INGEST_TOKEN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = motivationIngestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const userId = dashboardUserId();
    const checkin = await upsertMotivationCheckin(userId, parsed.data);
    return NextResponse.json({
      ok: true,
      id: checkin.id,
      local_date: checkin.local_date,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ingest failed";
    console.error("motivation ingest error", message);
    return NextResponse.json({ error: "Ingest failed" }, { status: 500 });
  }
}
