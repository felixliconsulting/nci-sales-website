import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { exchangeOuraCode, storeOuraTokens, syncOura } from "@/lib/adapters/oura";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || url.origin;

  const cookieStore = await cookies();
  const expected = cookieStore.get("oura_oauth_state")?.value;
  if (!code || !state || !expected || state !== expected) {
    return NextResponse.redirect(`${appUrl}/settings?oura=state_mismatch`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !state.startsWith(user.id)) {
    return NextResponse.redirect(`${appUrl}/login`);
  }

  try {
    const tokens = await exchangeOuraCode(code);
    await storeOuraTokens(user.id, tokens);
    await syncOura(user.id, 30);
    const res = NextResponse.redirect(`${appUrl}/settings?oura=connected`);
    res.cookies.set("oura_oauth_state", "", { maxAge: 0, path: "/" });
    return res;
  } catch (err) {
    console.error("oura callback", err instanceof Error ? err.message : err);
    return NextResponse.redirect(`${appUrl}/settings?oura=error`);
  }
}
