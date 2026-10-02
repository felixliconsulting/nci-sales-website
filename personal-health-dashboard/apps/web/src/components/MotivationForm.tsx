"use client";

import { FormEvent, useState } from "react";
import { ALLOWED_MOTIVATION_TAGS } from "@/lib/constants";

type Props = {
  initial?: {
    motivation?: number;
    energy?: number;
    soreness?: number;
    confidence?: number;
    note?: string | null;
    tags?: string[];
  } | null;
};

export function MotivationForm({ initial }: Props) {
  const [motivation, setMotivation] = useState(initial?.motivation ?? 5);
  const [energy, setEnergy] = useState(initial?.energy ?? 5);
  const [soreness, setSoreness] = useState(initial?.soreness ?? 3);
  const [confidence, setConfidence] = useState(initial?.confidence ?? 5);
  const [note, setNote] = useState(initial?.note ?? "");
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function toggleTag(tag: string) {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setStatus(null);
    const res = await fetch("/api/ingest/motivation/app", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        motivation,
        energy,
        soreness,
        confidence,
        note,
        tags,
      }),
    });
    const json = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      const detail =
        typeof json.error === "string"
          ? json.error
          : json.details
            ? "Validation failed"
            : `Save failed (${res.status})`;
      setStatus(detail);
      return;
    }
    setStatus("Saved for today.");
  }

  return (
    <form onSubmit={onSubmit} className="stack">
      {[
        ["Motivation", motivation, setMotivation],
        ["Energy", energy, setEnergy],
        ["Soreness", soreness, setSoreness],
        ["Confidence", confidence, setConfidence],
      ].map(([label, value, setter]) => (
        <div className="field" key={label as string}>
          <label>
            {label as string}: {value as number}
          </label>
          <input
            type="range"
            min={1}
            max={10}
            value={value as number}
            onChange={(e) =>
              (setter as (n: number) => void)(Number(e.target.value))
            }
          />
        </div>
      ))}
      <div className="field">
        <label htmlFor="note">Note</label>
        <textarea
          id="note"
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Context a score can’t capture"
        />
      </div>
      <div className="field">
        <label>Tags</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {ALLOWED_MOTIVATION_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              className="btn secondary"
              style={{
                minHeight: 36,
                padding: "0 12px",
                background: tags.includes(tag) ? "var(--accent-soft)" : "white",
              }}
              onClick={() => toggleTag(tag)}
            >
              {tag.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>
      <button className="btn" type="submit" disabled={saving}>
        {saving ? "Saving…" : "Save check-in"}
      </button>
      {status ? <p className="muted">{status}</p> : null}
    </form>
  );
}
