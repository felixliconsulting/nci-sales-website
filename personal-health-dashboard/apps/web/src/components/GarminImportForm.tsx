"use client";

import { FormEvent, useState } from "react";

export function GarminImportForm() {
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fileInput = form.elements.namedItem("file") as HTMLInputElement;
    if (!fileInput.files?.[0]) {
      setStatus("Choose a file first.");
      return;
    }
    setBusy(true);
    setStatus(null);
    const body = new FormData();
    body.set("file", fileInput.files[0]);
    const res = await fetch("/api/ingest/garmin", { method: "POST", body });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setStatus(json.error || "Import failed");
      return;
    }
    setStatus(`Imported ${json.inserted ?? 0} · skipped duplicates ${json.skipped ?? 0}`);
    form.reset();
  }

  return (
    <form onSubmit={onSubmit} className="stack">
      <input
        name="file"
        type="file"
        accept=".csv,.json,.fit,.zip"
        style={{ minHeight: 44 }}
      />
      <button className="btn" type="submit" disabled={busy}>
        {busy ? "Importing…" : "Upload Garmin export"}
      </button>
      {status ? <p className="muted">{status}</p> : null}
    </form>
  );
}
