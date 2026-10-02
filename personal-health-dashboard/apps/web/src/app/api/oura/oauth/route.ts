import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ouraAuthorizeUrl } from "@/lib/adapters/oura";
import { randomBytes } from "crypto";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"));
  }

  if (!process.env.OURA_CLIENT_ID || !process.env.OURA_REDIRECT_URI) {
    return NextResponse.json(
      { error: "Oura OAuth is not configured on the server" },
      { status: 503 },
    );
  }

  const state = `${user.id}.${randomBytes(16).toString("hex")}`;
  const response = NextResponse.redirect(ouraAuthorizeUrl(state));
  response.cookies.set("oura_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return response;
}
