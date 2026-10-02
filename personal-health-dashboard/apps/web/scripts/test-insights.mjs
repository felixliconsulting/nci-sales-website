import assert from "node:assert/strict";
import {
  insightStage,
  spearman,
  buildSleepMotivationInsight,
} from "../src/lib/insights/index.ts";

assert.equal(insightStage(10), "insufficient");
assert.equal(insightStage(20), "exploratory");
assert.equal(insightStage(40), "correlation");
assert.equal(insightStage(80), "lagged");

const rho = spearman([1, 2, 3, 4, 5], [2, 4, 6, 8, 10]);
assert.ok(rho != null && rho > 0.99);

const insight = buildSleepMotivationInsight(
  Array.from({ length: 40 }, (_, i) => ({
    local_date: `2026-01-${String(i + 1).padStart(2, "0")}`,
    motivation: 5 + (i % 5),
    prev_sleep_total_sec: 6 * 3600 + i * 60,
    has_motivation: true,
  })),
);
assert.equal(insight.stage, "correlation");
assert.equal(insight.sampleSize, 40);
assert.ok(insight.caveat.includes("not causation"));

console.log("insights ok");
