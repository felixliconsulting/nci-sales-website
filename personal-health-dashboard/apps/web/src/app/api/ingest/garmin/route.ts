import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { persistGarminImport } from "@/lib/adapters/garmin";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  try {
    const result = await persistGarminImport(user.id, file.name, buffer);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Import failed";
    console.error("garmin import error", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
