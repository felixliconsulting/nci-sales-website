export type InsightStage = "insufficient" | "exploratory" | "correlation" | "lagged";

export function insightStage(sampleSize: number): InsightStage {
  if (sampleSize < 14) return "insufficient";
  if (sampleSize < 30) return "exploratory";
  if (sampleSize < 60) return "correlation";
  return "lagged";
}

export function spearman(xs: number[], ys: number[]): number | null {
  if (xs.length !== ys.length || xs.length < 3) return null;
  const n = xs.length;
  const rank = (arr: number[]) => {
    const sorted = [...arr].map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
    const ranks = new Array(n);
    let i = 0;
    while (i < n) {
      let j = i;
      while (j + 1 < n && sorted[j + 1].v === sorted[i].v) j++;
      const avg = (i + j) / 2 + 1;
      for (let k = i; k <= j; k++) ranks[sorted[k].i] = avg;
      i = j + 1;
    }
    return ranks as number[];
  };
  const rx = rank(xs);
  const ry = rank(ys);
  let num = 0;
  let dx = 0;
  let dy = 0;
  const mx = rx.reduce((a, b) => a + b, 0) / n;
  const my = ry.reduce((a, b) => a + b, 0) / n;
  for (let i = 0; i < n; i++) {
    const a = rx[i] - mx;
    const b = ry[i] - my;
    num += a * b;
    dx += a * a;
    dy += b * b;
  }
  if (dx === 0 || dy === 0) return null;
  return num / Math.sqrt(dx * dy);
}

export type MatchedPoint = {
  date: string;
  x: number;
  y: number;
};

export type InsightResult = {
  questionKey: string;
  title: string;
  stage: InsightStage;
  sampleSize: number;
  missingRate: number;
  method: string;
  effect: number | null;
  direction: "positive" | "negative" | "none" | null;
  caveat: string;
  points: MatchedPoint[];
  windowStart: string | null;
  windowEnd: string | null;
};

function caveatFor(stage: InsightStage): string {
  switch (stage) {
    case "insufficient":
      return "Fewer than 14 matched days — showing data and missingness only. Not enough for a relationship claim.";
    case "exploratory":
      return "Exploratory view only. Every point is shown. Do not treat this as a stable personal pattern yet.";
    case "correlation":
      return "Spearman association for Felix only. Correlation is not causation.";
    case "lagged":
      return "Lagged personal association with simple context. Still not causal — interpret cautiously.";
  }
}

export function buildSleepMotivationInsight(
  rows: Array<{
    local_date: string;
    motivation: number | null;
    prev_sleep_total_sec: number | null;
    sleep_efficiency?: number | null;
    sleep_hrv?: number | null;
    has_motivation: boolean;
  }>,
): InsightResult {
  const eligible = rows.filter((r) => r.has_motivation);
  const matched = eligible.filter(
    (r) => r.motivation != null && r.prev_sleep_total_sec != null,
  );
  const points: MatchedPoint[] = matched.map((r) => ({
    date: r.local_date,
    x: (r.prev_sleep_total_sec as number) / 3600,
    y: r.motivation as number,
  }));
  const sampleSize = points.length;
  const stage = insightStage(sampleSize);
  const missingRate =
    eligible.length === 0 ? 1 : 1 - sampleSize / Math.max(eligible.length, 1);
  let effect: number | null = null;
  let method = "display_only";
  if (stage === "correlation" || stage === "lagged") {
    effect = spearman(
      points.map((p) => p.x),
      points.map((p) => p.y),
    );
    method = "spearman";
  } else if (stage === "exploratory") {
    method = "scatter_exploratory";
  }
  const direction =
    effect == null ? null : effect > 0.05 ? "positive" : effect < -0.05 ? "negative" : "none";

  return {
    questionKey: "prior_sleep_vs_motivation",
    title: "Prior-night sleep duration vs morning motivation",
    stage,
    sampleSize,
    missingRate,
    method,
    effect,
    direction,
    caveat: caveatFor(stage),
    points,
    windowStart: points[0]?.date ?? null,
    windowEnd: points[points.length - 1]?.date ?? null,
  };
}

export function buildLoadMotivationInsight(
  rows: Array<{
    local_date: string;
    motivation: number | null;
    energy: number | null;
    soreness: number | null;
    prev_activity_load: number | null;
    has_motivation: boolean;
  }>,
  outcome: "motivation" | "energy" | "soreness" = "motivation",
): InsightResult {
  const eligible = rows.filter((r) => r.has_motivation);
  const matched = eligible.filter((r) => {
    const y = r[outcome];
    return y != null && r.prev_activity_load != null;
  });
  const points = matched.map((r) => ({
    date: r.local_date,
    x: r.prev_activity_load as number,
    y: r[outcome] as number,
  }));
  const sampleSize = points.length;
  const stage = insightStage(sampleSize);
  const missingRate =
    eligible.length === 0 ? 1 : 1 - sampleSize / Math.max(eligible.length, 1);
  let effect: number | null = null;
  let method = "display_only";
  if (stage === "correlation" || stage === "lagged") {
    effect = spearman(
      points.map((p) => p.x),
      points.map((p) => p.y),
    );
    method = "spearman";
  } else if (stage === "exploratory") {
    method = "scatter_exploratory";
  }
  const direction =
    effect == null ? null : effect > 0.05 ? "positive" : effect < -0.05 ? "negative" : "none";

  return {
    questionKey: `prev_load_vs_${outcome}`,
    title: `Previous-day activity load vs ${outcome}`,
    stage,
    sampleSize,
    missingRate,
    method,
    effect,
    direction,
    caveat: caveatFor(stage),
    points,
    windowStart: points[0]?.date ?? null,
    windowEnd: points[points.length - 1]?.date ?? null,
  };
}

export function weeklyReflectionNotes(
  rows: Array<{
    local_date: string;
    motivation: number | null;
    sleep_total_sec: number | null;
    activity_load: number | null;
    tags: string[] | null;
  }>,
): Array<{ date: string; note: string }> {
  if (rows.length === 0) return [];
  const withMot = rows.filter((r) => r.motivation != null);
  const notes: Array<{ date: string; note: string }> = [];
  if (withMot.length) {
    const sorted = [...withMot].sort(
      (a, b) => (a.motivation as number) - (b.motivation as number),
    );
    const low = sorted[0];
    const high = sorted[sorted.length - 1];
    notes.push({
      date: low.local_date,
      note: `Lowest motivation (${low.motivation}/10). Sleep ${(
        (low.sleep_total_sec || 0) / 3600
      ).toFixed(1)}h, load ${low.activity_load ?? "—"}.`,
    });
    notes.push({
      date: high.local_date,
      note: `Highest motivation (${high.motivation}/10). Sleep ${(
        (high.sleep_total_sec || 0) / 3600
      ).toFixed(1)}h, load ${high.activity_load ?? "—"}.`,
    });
  }
  const tagged = rows.filter((r) => (r.tags?.length || 0) > 0);
  for (const t of tagged.slice(0, 3)) {
    notes.push({
      date: t.local_date,
      note: `Tagged: ${(t.tags || []).join(", ")}.`,
    });
  }
  return notes;
}
