import { redirect } from "next/navigation";
import { ScatterPoints } from "@/components/Charts";
import { loadFeatures, requireUser } from "@/lib/data";
import {
  buildLoadMotivationInsight,
  buildSleepMotivationInsight,
} from "@/lib/insights";

export default async function ExplorePage() {
  const { user } = await requireUser();
  if (!user) redirect("/login");

  let rows: Array<Record<string, unknown>> = [];
  try {
    rows = await loadFeatures(user.id, 90);
  } catch {
    rows = [];
  }

  const typed = rows.map((r) => ({
    local_date: String(r.local_date),
    motivation: r.motivation as number | null,
    energy: r.energy as number | null,
    soreness: r.soreness as number | null,
    prev_sleep_total_sec: r.prev_sleep_total_sec as number | null,
    prev_activity_load: r.prev_activity_load as number | null,
    has_motivation: Boolean(r.has_motivation),
  }));

  const sleepInsight = buildSleepMotivationInsight(typed);
  const loadInsight = buildLoadMotivationInsight(typed, "motivation");

  return (
    <main className="stack">
      <header className="rise">
        <p className="pill">One relationship at a time</p>
        <h1 style={{ margin: "10px 0 4px", fontSize: 34 }}>Explore</h1>
        <p className="muted" style={{ margin: 0 }}>
          Every point visible. Correlation is never causation.
        </p>
      </header>

      <InsightCard insight={sleepInsight} xLabel="Prior sleep (h)" yLabel="Motivation" />
      <InsightCard insight={loadInsight} xLabel="Prior load" yLabel="Motivation" />
    </main>
  );
}

function InsightCard({
  insight,
  xLabel,
  yLabel,
}: {
  insight: ReturnType<typeof buildSleepMotivationInsight>;
  xLabel: string;
  yLabel: string;
}) {
  return (
    <section className="panel rise">
      <h2 style={{ margin: "0 0 6px", fontSize: 18 }}>{insight.title}</h2>
      <p className="muted" style={{ marginTop: 0 }}>
        Stage: {insight.stage} · N={insight.sampleSize} · missing{" "}
        {Math.round(insight.missingRate * 100)}% · method {insight.method}
        {insight.effect != null ? ` · ρ=${insight.effect.toFixed(2)}` : ""}
      </p>
      {insight.points.length ? (
        <ScatterPoints points={insight.points} xLabel={xLabel} yLabel={yLabel} />
      ) : (
        <p className="muted">No matched observations yet.</p>
      )}
      <p style={{ marginBottom: 0 }}>{insight.caveat}</p>
    </section>
  );
}
