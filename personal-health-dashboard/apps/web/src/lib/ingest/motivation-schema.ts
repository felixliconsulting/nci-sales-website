import { z } from "zod";

export const motivationIngestSchema = z.object({
  motivation: z.number().int().min(1).max(10),
  energy: z.number().int().min(1).max(10),
  soreness: z.number().int().min(1).max(10),
  confidence: z.number().int().min(1).max(10),
  note: z.string().max(4000).optional().nullable(),
  tags: z
    .array(
      z.enum([
        "illness",
        "injury",
        "travel",
        "race",
        "unusual_stress",
      ]),
    )
    .optional()
    .default([]),
  asked_at: z.string().optional().nullable(),
  answered_at: z.string().optional(),
  local_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  capture_source: z.enum(["grokbot", "app", "craft"]).default("grokbot"),
});

export type MotivationIngestInput = z.infer<typeof motivationIngestSchema>;
