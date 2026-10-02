import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { motivationIngestSchema } from "@/lib/ingest/motivation-schema";
import { upsertMotivationCheckin } from "@/lib/ingest/motivation";
import { localDateInAppTz } from "@/lib/crypto";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = motivationIngestSchema.safeParse({
    ...body,
    capture_source: "app",
    local_date: body.local_date || localDateInAppTz(),
    answered_at: body.answered_at || new Date().toISOString(),
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const checkin = await upsertMotivationCheckin(user.id, parsed.data);
    return NextResponse.json({ ok: true, id: checkin.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Save failed";
    console.error("motivation app ingest", message);
    return NextResponse.json(
      {
        error: message.includes("not configured")
          ? "Server missing SUPABASE_SERVICE_ROLE_KEY in .env.local"
          : message.includes("relation") || message.includes("does not exist")
            ? "Database tables missing — run supabase/migrations/20261002000000_init.sql in Supabase SQL Editor"
            : "Save failed — check terminal logs / that the SQL migration was run",
      },
      { status: 500 },
    );
  }
}
