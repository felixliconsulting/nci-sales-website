"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AccountActions({ email }: { email: string }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function syncOura() {
    setBusy(true);
    setMessage(null);
    const res = await fetch("/api/sync/oura", { method: "POST" });
    setBusy(false);
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setMessage(json.error || "Oura sync failed");
      return;
    }
    setMessage("Oura sync finished.");
    router.refresh();
  }

  async function signOut() {
    await fetch("/api/auth/signout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  async function deleteAll() {
    const ok = window.confirm(
      "Delete ALL your Pulse Desk data? This cannot be undone.",
    );
    if (!ok) return;
    const confirm = window.prompt('Type DELETE to confirm');
    if (confirm !== "DELETE") return;
    setBusy(true);
    const res = await fetch("/api/account/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm: "DELETE" }),
    });
    setBusy(false);
    if (!res.ok) {
      setMessage("Delete failed");
      return;
    }
    router.replace("/login");
  }

  return (
    <div className="stack">
      <p className="muted" style={{ margin: 0 }}>
        Signed in as {email}
      </p>
      <button className="btn secondary" type="button" onClick={syncOura} disabled={busy}>
        Sync Oura now
      </button>
      <a className="btn secondary" href="/api/account/export">
        Download personal export
      </a>
      <button className="btn secondary" type="button" onClick={signOut}>
        Sign out
      </button>
      <button className="btn danger" type="button" onClick={deleteAll} disabled={busy}>
        Delete all my data
      </button>
      {message ? <p className="muted">{message}</p> : null}
    </div>
  );
}
