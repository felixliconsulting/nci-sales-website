import { redirect } from "next/navigation";
import { loadFeatures, requireUser } from "@/lib/data";
import { weeklyReflectionNotes } from "@/lib/insights";

export default async function ReflectPage() {
  const { user } = await requireUser();
  if (!user) redirect("/login");

  let rows: Array<Record<string, unknown>> = [];
  try {
    rows = await loadFeatures(user.id, 14);
  } catch {
    rows = [];
  }

  const notes = weeklyReflectionNotes(
    rows.map((r) => ({
      local_date: String(r.local_date),
      motivation: r.motivation as number | null,
      sleep_total_sec: r.sleep_total_sec as number | null,
      activity_load: r.activity_load as number | null,
      tags: (r.tags as string[]) || [],
    })),
  );

  return (
    <main className="stack">
      <header className="rise">
        <p className="pill">Last 14 days</p>
        <h1 style={{ margin: "10px 0 4px", fontSize: 34 }}>Weekly reflection</h1>
        <p className="muted" style={{ margin: 0 }}>
          Notable patterns linked back to observations — not prescriptions.
        </p>
      </header>

      <section className="panel rise rise-delay-1">
        {notes.length === 0 ? (
          <p className="muted">
            Need a few more check-ins and synced days before reflection notes appear.
          </p>
        ) : (
          <ul className="stack" style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {notes.map((n) => (
              <li key={`${n.date}-${n.note}`}>
                <strong>{n.date}</strong>
                <div className="muted">{n.note}</div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
