"use client";
import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Card } from "@/components/ui/Card";
import type { TimeseriesPoint } from "@/lib/types";

type MetricKey = "clicks" | "impressions" | "ctr" | "position";
const METRICS: { key: MetricKey; label: string; color: string }[] = [
  { key: "clicks", label: "Clicks", color: "#a78bfa" },
  { key: "impressions", label: "Impressions", color: "#3b82f6" },
  { key: "ctr", label: "CTR (%)", color: "#eab308" },
  { key: "position", label: "Avg Position", color: "#22c55e" },
];

export function TrendChart({ data }: { data: TimeseriesPoint[] }) {
  const [active, setActive] = useState<MetricKey>("clicks");
  const meta = METRICS.find((m) => m.key === active)!;
  const series = data.map((d) => ({ date: d.date, value: active === "ctr" ? d.ctr * 100 : d[active] }));
  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Performance Trends</h2>
        <div className="flex gap-2">
          {METRICS.map((m) => (
            <button
              key={m.key}
              onClick={() => setActive(m.key)}
              className={`rounded-full px-3 py-1 text-xs ${active === m.key ? "bg-accent text-white" : "bg-surface text-slate-400"}`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series}>
            <CartesianGrid strokeDasharray="3 3" stroke="#243049" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#64748b" }} minTickGap={24} />
            <YAxis tick={{ fontSize: 11, fill: "#64748b" }} reversed={active === "position"} />
            <Tooltip contentStyle={{ background: "#151d30", border: "1px solid #243049" }} />
            <Line type="monotone" dataKey="value" stroke={meta.color} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
