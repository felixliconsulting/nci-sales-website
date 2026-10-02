import type { GarminAdapter, GarminImportResult } from "./types";

/**
 * Stub for the official Garmin Connect Developer Program API.
 * Swap this in when/if business API access is approved.
 */
export class GarminOfficialAdapter implements GarminAdapter {
  readonly name = "official" as const;

  async importPayload(): Promise<GarminImportResult> {
    throw new Error(
      "Official Garmin API adapter is not configured. Use the export importer for v1.",
    );
  }
}
