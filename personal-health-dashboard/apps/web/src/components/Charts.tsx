"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ScatterChart,
  Scatter,
  CartesianGrid,
} from "recharts";

export function TrendChart({
  data,
  series,
}: {
  data: Array<Record<string, string | number | null>>;
  series: Array<{ key: string; color: string; name: string }>;
}) {
  return (
    <div style={{ width: "100%", height: 220 }}>
      <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid stroke="#d5dee5" strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} width={28} />
          <Tooltip />
          {series.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.name}
              stroke={s.color}
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ScatterPoints({
  points,
  xLabel,
  yLabel,
}: {
  points: Array<{ x: number; y: number; date: string }>;
  xLabel: string;
  yLabel: string;
}) {
  return (
    <div style={{ width: "100%", height: 240 }}>
      <ResponsiveContainer>
        <ScatterChart>
          <CartesianGrid stroke="#d5dee5" strokeDasharray="3 3" />
          <XAxis type="number" dataKey="x" name={xLabel} tick={{ fontSize: 11 }} />
          <YAxis type="number" dataKey="y" name={yLabel} tick={{ fontSize: 11 }} width={28} />
          <Tooltip cursor={{ strokeDasharray: "3 3" }} />
          <Scatter data={points} fill="#0f5c5c" />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
