"use client";

import { useRouter } from "next/navigation";

type Props = {
  value: string;
  max?: string;
};

export function DayPicker({ value, max }: Props) {
  const router = useRouter();

  function go(delta: number) {
    const d = new Date(`${value}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + delta);
    const next = d.toISOString().slice(0, 10);
    if (max && next > max) return;
    router.push(`/today?date=${next}`);
  }

  return (
    <div className="row" style={{ marginTop: 12, gap: 8 }}>
      <button
        type="button"
        className="btn secondary"
        style={{ minWidth: 44, padding: "0 12px" }}
        onClick={() => go(-1)}
        aria-label="Previous day"
      >
        ←
      </button>
      <input
        type="date"
        value={value}
        max={max}
        onChange={(e) => {
          if (!e.target.value) return;
          router.push(`/today?date=${e.target.value}`);
        }}
        style={{
          flex: 1,
          minHeight: 44,
          borderRadius: 12,
          border: "1px solid var(--line)",
          padding: "0 12px",
          font: "inherit",
          background: "white",
        }}
      />
      <button
        type="button"
        className="btn secondary"
        style={{ minWidth: 44, padding: "0 12px" }}
        onClick={() => go(1)}
        aria-label="Next day"
        disabled={Boolean(max && value >= max)}
      >
        →
      </button>
    </div>
  );
}
