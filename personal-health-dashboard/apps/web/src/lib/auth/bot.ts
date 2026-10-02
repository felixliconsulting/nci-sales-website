import { timingSafeEqualString, requireEnv } from "@/lib/crypto";

export function authorizeBotToken(
  request: Request,
  envName: "MOTIVATION_INGEST_TOKEN" | "SYNC_BOT_TOKEN" = "MOTIVATION_INGEST_TOKEN",
): boolean {
  const header = request.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return false;
  const expected = process.env[envName];
  if (!expected) return false;
  return timingSafeEqualString(match[1].trim(), expected);
}

export function dashboardUserId(): string {
  return requireEnv("DASHBOARD_USER_ID");
}
