import { redirect } from "next/navigation";
import { MotivationForm } from "@/components/MotivationForm";
import {
  freshnessLabel,
  hoursFromSec,
  loadTodayBundle,
  requireUser,
} from "@/lib/data";

export default async function TodayPage() {
  const { user } = await requireUser();
  if (!user) redirect("/login");

  let bundle;
  try {
    bundle = await loadTodayBundle(user.id);
  } catch {
    bundle = {
      today: new Date().toISOString().slice(0, 10),
      sleep: null,
      readiness: null,
      activities: [] as Array<Record<string, unknown>>,
      checkin: null,
      connections: [] as Array<{
        source: string;
        status: string;
        last_sync_at: string | null;
        last_error: string | null;
      }>,
    };
  }

  return (
    <main className="stack">
      <header className="rise">
        <p className="pill">Pulse Desk</p>
        <h1 style={{ margin: "10px 0 4px", fontSize: 36 }}>Today</h1>
        <p className="muted" style={{ margin: 0 }}>
          {bundle.today} · morning view
        </p>
      </header>

      <section className="panel rise rise-delay-1">
        <div className="row">
          <h2 style={{ margin: 0, fontSize: 20 }}>Last night</h2>
          <span className="muted">
            {bundle.sleep ? bundle.sleep.source : "no sleep yet"}
          </span>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            marginTop: 14,
          }}
        >
          <div>
            <div className="muted">Sleep</div>
            <div className="metric">{hoursFromSec(bundle.sleep?.total_sleep_sec)}</div>
          </div>
          <div>
            <div className="muted">Readiness</div>
            <div className="metric">{bundle.readiness?.readiness ?? "—"}</div>
          </div>
          <div>
            <div className="muted">Efficiency</div>
            <div className="metric">
              {bundle.sleep?.efficiency != null ? `${bundle.sleep.efficiency}` : "—"}
            </div>
          </div>
          <div>
            <div className="muted">HRV</div>
            <div className="metric">{bundle.sleep?.hrv ?? "—"}</div>
          </div>
        </div>
      </section>

      <section className="panel rise rise-delay-2">
        <h2 style={{ margin: "0 0 10px", fontSize: 20 }}>Recent training</h2>
        {bundle.activities.length === 0 ? (
          <p className="muted">No recent activities imported.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }} className="stack">
            {bundle.activities.map((a) => (
              <li key={String(a.id)} className="row">
                <div>
                  <strong>{String(a.sport || "Activity")}</strong>
                  <div className="muted">{String(a.local_date)}</div>
                </div>
                <div className="muted">
                  {a.duration_sec
                    ? `${Math.round(Number(a.duration_sec) / 60)} min`
                    : "—"}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel rise rise-delay-3">
        <h2 style={{ margin: "0 0 10px", fontSize: 20 }}>Motivation check-in</h2>
        <MotivationForm initial={bundle.checkin} />
      </section>

      <section className="panel">
        <h2 style={{ margin: "0 0 10px", fontSize: 20 }}>Source freshness</h2>
        <div className="stack">
          {["oura", "garmin", "motivation"].map((source) => {
            const conn = bundle.connections.find((c) => c.source === source);
            const stale =
              !conn?.last_sync_at ||
              Date.now() - new Date(conn.last_sync_at).getTime() > 36 * 3600_000;
            return (
              <div key={source} className="row">
                <div>
                  <strong style={{ textTransform: "capitalize" }}>{source}</strong>
                  <div className="muted">
                    {conn?.status || "disconnected"} · {freshnessLabel(conn?.last_sync_at)}
                  </div>
                </div>
                <span className={`pill ${stale ? "warn" : ""}`}>
                  {stale ? "stale" : "fresh"}
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
