export type NormalizedActivity = {
  external_id: string;
  started_at_utc: string;
  local_date: string;
  sport: string | null;
  duration_sec: number | null;
  distance_m: number | null;
  pace_sec_per_km: number | null;
  elevation_m: number | null;
  avg_hr: number | null;
  max_hr: number | null;
  training_load: number | null;
  raw: unknown;
};

export type NormalizedSleep = {
  external_id: string;
  sleep_date: string;
  total_sleep_sec: number | null;
  time_in_bed_sec: number | null;
  efficiency: number | null;
  score: number | null;
  resting_hr: number | null;
  hrv: number | null;
  raw: unknown;
};

export type NormalizedReadiness = {
  external_id: string;
  local_date: string;
  readiness: number | null;
  body_battery: number | null;
  stress: number | null;
  raw: unknown;
};

export type GarminImportResult = {
  activities: NormalizedActivity[];
  sleep: NormalizedSleep[];
  readiness: NormalizedReadiness[];
  skippedDuplicates: number;
  parserVersion: string;
};

/** Interchangeable Garmin source — export now, official API later. */
export interface GarminAdapter {
  readonly name: "export" | "official";
  importPayload(input: {
    filename: string;
    content: Buffer;
    contentType?: string;
  }): Promise<GarminImportResult>;
}
