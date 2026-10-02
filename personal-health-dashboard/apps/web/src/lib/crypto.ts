import { createHash, createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";
import { APP_TIMEZONE } from "./constants";

export function sha256Hex(input: string | Buffer): string {
  return createHash("sha256").update(input).digest("hex");
}

export function localDateInAppTz(date = new Date(), timeZone = APP_TIMEZONE): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function deriveKey(secret: string): Buffer {
  return scryptSync(secret, "phd-token-salt", 32);
}

/** Encrypt a secret for storage. Format: iv:ciphertext:tag (hex). */
export function encryptSecret(plaintext: string, secret = process.env.TOKEN_ENCRYPTION_KEY || ""): string {
  if (!secret || secret.length < 16) {
    throw new Error("TOKEN_ENCRYPTION_KEY must be set (16+ chars)");
  }
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", deriveKey(secret), iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${enc.toString("hex")}:${tag.toString("hex")}`;
}

export function decryptSecret(payload: string, secret = process.env.TOKEN_ENCRYPTION_KEY || ""): string {
  if (!secret || secret.length < 16) {
    throw new Error("TOKEN_ENCRYPTION_KEY must be set (16+ chars)");
  }
  const [ivHex, dataHex, tagHex] = payload.split(":");
  if (!ivHex || !dataHex || !tagHex) throw new Error("Invalid encrypted payload");
  const decipher = createDecipheriv("aes-256-gcm", deriveKey(secret), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataHex, "hex")),
    decipher.final(),
  ]).toString("utf8");
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env ${name}`);
  return value;
}

export function timingSafeEqualString(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  const { timingSafeEqual } = require("crypto") as typeof import("crypto");
  return timingSafeEqual(bufA, bufB);
}
