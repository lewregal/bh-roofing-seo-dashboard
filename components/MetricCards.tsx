import { Card } from "@/components/ui/Card";
import { Delta } from "@/components/ui/Delta";
import { Sparkline } from "@/components/ui/Sparkline";
import type { SummaryWithDelta, TimeseriesPoint } from "@/lib/types";

function fmtInt(n: number) { return Math.round(n).toLocaleString("en-US"); }
function fmtCompact(n: number) { return Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n); }

export function MetricCards({ summary, timeseries }: { summary: SummaryWithDelta; timeseries: TimeseriesPoint[] }) {
  const cards = [
    { label: "Total Clicks", value: fmtInt(summary.current.clicks), prev: fmtInt(summary.previous.clicks),
      pct: summary.changePct.clicks, lower: false, spark: timeseries.map((t) => t.clicks), color: "#a78bfa" },
    { label: "Total Impressions", value: fmtCompact(summary.current.impressions), prev: fmtCompact(summary.previous.impressions),
      pct: summary.changePct.impressions, lower: false, spark: timeseries.map((t) => t.impressions), color: "#3b82f6" },
    { label: "Average CTR", value: `${(summary.current.ctr * 100).toFixed(1)}%`, prev: `${(summary.previous.ctr * 100).toFixed(1)}%`,
      pct: summary.changePct.ctr, lower: false, spark: timeseries.map((t) => t.ctr), color: "#eab308" },
    { label: "Average Position", value: summary.current.position.toFixed(1), prev: summary.previous.position.toFixed(1),
      pct: summary.changePct.position, lower: true, spark: timeseries.map((t) => t.position), color: "#22c55e" },
  ];
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <Card key={c.label}>
          <div className="flex items-start justify-between">
            <div className="text-3xl font-bold">{c.value}</div>
            <Delta pct={c.pct} lowerIsBetter={c.lower} />
          </div>
          <div className="mt-1 text-sm text-slate-400">{c.label}</div>
          <div className="mt-3 flex items-end justify-between">
            <div className="text-xs text-slate-500">Previous {c.prev}</div>
            <Sparkline data={c.spark} color={c.color} />
          </div>
        </Card>
      ))}
    </div>
  );
}
