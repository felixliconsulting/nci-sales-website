import { redirect } from "next/navigation";
import { freshnessLabel, requireUser } from "@/lib/data";
import { GarminImportForm } from "@/components/GarminImportForm";
import { AccountActions } from "@/components/AccountActions";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ oura?: string }>;
}) {
  const { user, supabase } = await requireUser();
  if (!user) redirect("/login");
  const params = await searchParams;

  let connections: Array<{
    source: string;
    status: string;
    last_sync_at: string | null;
    last_error: string | null;
  }> = [];
  try {
    const { data } = await supabase
      .from("source_connections")
      .select("*")
      .eq("user_id", user.id);
    connections = data ?? [];
  } catch {
    connections = [];
  }

  return (
    <main className="stack">
      <header className="rise">
        <p className="pill">Data health</p>
        <h1 style={{ margin: "10px 0 4px", fontSize: 34 }}>Settings</h1>
        <p className="muted" style={{ margin: 0 }}>
          Connections, imports, export, and sign-out.
        </p>
      </header>

      {params.oura ? (
        <p className={`pill ${params.oura === "connected" ? "" : "warn"}`}>
          Oura: {params.oura.replaceAll("_", " ")}
        </p>
      ) : null}

      <section className="panel rise rise-delay-1">
        <h2 style={{ margin: "0 0 10px", fontSize: 18 }}>Connections</h2>
        <div className="stack">
          {["oura", "garmin", "motivation"].map((source) => {
            const conn = connections.find((c) => c.source === source);
            return (
              <div key={source} className="row">
                <div>
                  <strong style={{ textTransform: "capitalize" }}>{source}</strong>
                  <div className="muted">
                    {conn?.status || "disconnected"} · {freshnessLabel(conn?.last_sync_at)}
                  </div>
                  {conn?.last_error ? (
                    <div className="pill warn" style={{ marginTop: 6 }}>
                      {conn.last_error}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 14 }}>
          <a className="btn" href="/api/oura/oauth">
            Connect / reconnect Oura
          </a>
        </div>
        <p className="muted">
          Free-tier note: Supabase may pause after inactivity. Opening the app or running a sync wakes it.
        </p>
      </section>

      <section className="panel rise rise-delay-2">
        <h2 style={{ margin: "0 0 10px", fontSize: 18 }}>Garmin import</h2>
        <p className="muted">
          Upload Garmin activity CSV or wellness JSON. No Garmin password is stored.
        </p>
        <GarminImportForm />
      </section>

      <section className="panel rise rise-delay-3">
        <h2 style={{ margin: "0 0 10px", fontSize: 18 }}>Account</h2>
        <AccountActions email={user.email || ""} />
      </section>
    </main>
  );
}
