import type {
  GarminAdapter,
  GarminImportResult,
  NormalizedActivity,
  NormalizedReadiness,
  NormalizedSleep,
} from "./types";
import { sha256Hex } from "@/lib/crypto";

/**
 * Sanctioned Garmin path: CSV activity list, FIT stubs metadata, account-export wellness JSON.
 * Does not store Garmin credentials.
 */
export class GarminExportAdapter implements GarminAdapter {
  readonly name = "export" as const;
  readonly parserVersion = "1";

  async importPayload(input: {
    filename: string;
    content: Buffer;
    contentType?: string;
  }): Promise<GarminImportResult> {
    const lower = input.filename.toLowerCase();
    if (lower.endsWith(".csv")) {
      return this.parseActivityCsv(input.content.toString("utf8"));
    }
    if (lower.endsWith(".json")) {
      return this.parseWellnessJson(input.content.toString("utf8"), input.filename);
    }
    if (lower.endsWith(".zip")) {
      // ZIP parsing without heavy deps: look for embedded JSON text chunks if unzipped client-side.
      // For v1, ask users to upload CSV/JSON extracted from the archive.
      throw new Error(
        "Upload extracted activity CSV or wellness JSON from the Garmin ZIP (see docs/garmin-export-howto.md).",
      );
    }
    if (lower.endsWith(".fit")) {
      return this.parseFitPlaceholder(input.content, input.filename);
    }
    throw new Error(`Unsupported Garmin file type: ${input.filename}`);
  }

  private parseActivityCsv(text: string): GarminImportResult {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length < 2) {
      return emptyResult(this.parserVersion);
    }
    const headers = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
    const activities: NormalizedActivity[] = [];

    for (const line of lines.slice(1)) {
      const cols = splitCsvLine(line);
      const row: Record<string, string> = {};
      headers.forEach((h, i) => {
        row[h] = cols[i] ?? "";
      });

      const dateRaw =
        row["date"] || row["start time"] || row["start"] || row["activity date"] || "";
      const localDate = extractDate(dateRaw);
      if (!localDate) continue;

      const title = row["activity type"] || row["type"] || row["title"] || "activity";
      const durationSec = parseDuration(row["time"] || row["duration"] || "");
      const distanceM = parseDistanceMeters(row["distance"] || "");
      const avgHr = num(row["avg hr"] || row["average hr"] || row["avg heart rate"]);
      const maxHr = num(row["max hr"] || row["max heart rate"]);
      const elev = num(row["elev gain"] || row["elevation gain"] || row["elevation"]);
      const load = num(row["training stress score®"] || row["training load"] || row["tss"]);
      const externalId =
        row["activity id"] ||
        row["id"] ||
        sha256Hex(`${localDate}|${title}|${row["time"]}|${row["distance"]}`).slice(0, 24);

      let pace: number | null = null;
      if (distanceM && durationSec && distanceM > 0) {
        pace = durationSec / (distanceM / 1000);
      }

      activities.push({
        external_id: `garmin-csv-${externalId}`,
        started_at_utc: `${localDate}T12:00:00Z`,
        local_date: localDate,
        sport: title,
        duration_sec: durationSec,
        distance_m: distanceM,
        pace_sec_per_km: pace,
        elevation_m: elev,
        avg_hr: avgHr,
        max_hr: maxHr,
        training_load: load,
        raw: row,
      });
    }

    return {
      activities,
      sleep: [],
      readiness: [],
      skippedDuplicates: 0,
      parserVersion: this.parserVersion,
    };
  }

  private parseWellnessJson(text: string, filename: string): GarminImportResult {
    const parsed = JSON.parse(text) as unknown;
    const sleep: NormalizedSleep[] = [];
    const readiness: NormalizedReadiness[] = [];

    const items = Array.isArray(parsed) ? parsed : [parsed];
    for (const item of items) {
      if (!item || typeof item !== "object") continue;
      const rec = item as Record<string, unknown>;

      if (filename.toLowerCase().includes("sleep") || "sleepTimeSeconds" in rec || "sleepStartTimestampGMT" in rec) {
        const sleepDate =
          extractDate(String(rec.calendarDate || rec.sleepStartTimestampLocal || "")) ||
          extractDate(String(rec.date || ""));
        if (!sleepDate) continue;
        const total = num(rec.sleepTimeSeconds) ?? num(rec.durationInSeconds);
        const tib = num(rec.durationInSeconds) ?? total;
        sleep.push({
          external_id: `garmin-sleep-${sleepDate}`,
          sleep_date: sleepDate,
          total_sleep_sec: total,
          time_in_bed_sec: tib,
          efficiency: total && tib ? Math.round((total / tib) * 1000) / 10 : null,
          score: num((rec.sleepScores as { overall?: { value?: number } } | undefined)?.overall?.value) ?? num(rec.overallScore),
          resting_hr: num(rec.restingHeartRate),
          hrv: num(rec.avgOvernightHrv) ?? num(rec.hrv),
          raw: rec,
        });
      }

      if ("bodyBatteryMostRecentValue" in rec || "averageStressLevel" in rec || filename.toLowerCase().includes("wellness")) {
        const localDate =
          extractDate(String(rec.calendarDate || rec.date || "")) ||
          null;
        if (!localDate) continue;
        readiness.push({
          external_id: `garmin-ready-${localDate}`,
          local_date: localDate,
          readiness: num(rec.bodyBatteryMostRecentValue),
          body_battery: num(rec.bodyBatteryMostRecentValue),
          stress: num(rec.averageStressLevel),
          raw: rec,
        });
      }
    }

    return {
      activities: [],
      sleep,
      readiness,
      skippedDuplicates: 0,
      parserVersion: this.parserVersion,
    };
  }

  private parseFitPlaceholder(content: Buffer, filename: string): GarminImportResult {
    // Full FIT decode can be added with @garmin/fitsdk later. V1 records a stub from filename date if present.
    const dateMatch = filename.match(/(\d{4}-\d{2}-\d{2})/);
    const localDate = dateMatch?.[1] || new Date().toISOString().slice(0, 10);
    const externalId = `garmin-fit-${sha256Hex(content).slice(0, 16)}`;
    return {
      activities: [
        {
          external_id: externalId,
          started_at_utc: `${localDate}T12:00:00Z`,
          local_date: localDate,
          sport: "fit_import",
          duration_sec: null,
          distance_m: null,
          pace_sec_per_km: null,
          elevation_m: null,
          avg_hr: null,
          max_hr: null,
          training_load: null,
          raw: { filename, bytes: content.length, note: "FIT binary stored as raw only in v1" },
        },
      ],
      sleep: [],
      readiness: [],
      skippedDuplicates: 0,
      parserVersion: this.parserVersion,
    };
  }
}

function emptyResult(parserVersion: string): GarminImportResult {
  return { activities: [], sleep: [], readiness: [], skippedDuplicates: 0, parserVersion };
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      out.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur.trim());
  return out;
}

function extractDate(raw: string): string | null {
  const m = raw.match(/(\d{4}-\d{2}-\d{2})/);
  if (m) return m[1];
  const m2 = raw.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (m2) {
    const year = m2[3].length === 2 ? `20${m2[3]}` : m2[3];
    return `${year}-${m2[1].padStart(2, "0")}-${m2[2].padStart(2, "0")}`;
  }
  return null;
}

function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const n = Number(String(v).replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function parseDuration(raw: string): number | null {
  if (!raw) return null;
  if (/^\d+$/.test(raw)) return Number(raw);
  const parts = raw.split(":").map(Number);
  if (parts.some((p) => Number.isNaN(p))) return null;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return null;
}

function parseDistanceMeters(raw: string): number | null {
  if (!raw) return null;
  const lower = raw.toLowerCase();
  const n = num(raw);
  if (n == null) return null;
  if (lower.includes("km")) return n * 1000;
  if (lower.includes("mi")) return n * 1609.34;
  // Garmin CSV often already km as decimal
  if (n < 200) return n * 1000;
  return n;
}
