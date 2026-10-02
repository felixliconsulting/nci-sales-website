export const APP_TIMEZONE = process.env.APP_TIMEZONE || "America/Vancouver";

export const ALLOWED_MOTIVATION_TAGS = [
  "illness",
  "injury",
  "travel",
  "race",
  "unusual_stress",
] as const;

export type MotivationTag = (typeof ALLOWED_MOTIVATION_TAGS)[number];

export type CaptureSource = "grokbot" | "app" | "craft";

export type SourceName = "oura" | "garmin" | "motivation" | "craft";
