import { redirect } from "next/navigation";
import { TrendChart } from "@/components/Charts";
import { loadFeatures, requireUser } from "@/lib/data";

export default async function TrendsPage() {
  const { user } = await requireUser();
  if (!user) redirect("/login");

  let rows: Array<Record<string, unknown>> = [];
  try {
    rows = await loadFeatures(user.id, 30);
  } catch {
    rows = [];
  }

  const chart = rows.map((r) => ({
    date: String(r.local_date).slice(5),
    motivation: r.motivation as number | null,
    sleepHours:
      r.sleep_total_sec != null ? Number(r.sleep_total_sec) / 3600 : null,
    readiness: r.readiness as number | null,
    load: r.activity_load as number | null,
  }));

  return (
    <main className="stack">
      <header className="rise">
        <p className="pill">30 days</p>
        <h1 style={{ margin: "10px 0 4px", fontSize: 34 }}>Trends</h1>
        <p className="muted" style={{ margin: 0 }}>
          Sleep, recovery, training, and motivation over time.
        </p>
      </header>

      <section className="panel rise rise-delay-1">
        <h2 style={{ margin: "0 0 8px", fontSize: 18 }}>Motivation</h2>
        <TrendChart
          data={chart}
          series={[{ key: "motivation", color: "#0f5c5c", name: "Motivation" }]}
        />
      </section>

      <section className="panel rise rise-delay-2">
        <h2 style={{ margin: "0 0 8px", fontSize: 18 }}>Sleep hours</h2>
        <TrendChart
          data={chart}
          series={[{ key: "sleepHours", color: "#2f6f8f", name: "Sleep h" }]}
        />
      </section>

      <section className="panel rise rise-delay-3">
        <h2 style={{ margin: "0 0 8px", fontSize: 18 }}>Readiness & load</h2>
        <TrendChart
          data={chart}
          series={[
            { key: "readiness", color: "#3d7a5c", name: "Readiness" },
            { key: "load", color: "#9a4b2e", name: "Load" },
          ]}
        />
      </section>

      {chart.length === 0 ? (
        <p className="muted">No daily features yet — add a check-in and sync sources.</p>
      ) : null}
    </main>
  );
}
