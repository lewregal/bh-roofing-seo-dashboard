import { Card } from "@/components/ui/Card";
import { ArrowUp, ArrowDown } from "lucide-react";
import type { MapTrackerRow } from "@/lib/types";

function RankDelta({ delta }: { delta: number | null }) {
  if (delta === null) return <span className="text-slate-500">n/a</span>;
  if (delta === 0) return <span className="text-slate-400">0</span>;
  const improved = delta > 0; // positive = rank improved (moved up)
  const Icon = improved ? ArrowUp : ArrowDown;
  const color = improved ? "text-good" : "text-bad";
  return (
    <span className={`inline-flex items-center gap-1 font-medium ${color}`}>
      <Icon className="h-3 w-3" />
      {Math.abs(delta)}
    </span>
  );
}

export function LocalRankTable({ rows }: { rows: MapTrackerRow[] }) {
  return (
    <Card>
      <h3 className="mb-3 text-sm font-semibold text-slate-300">Local rank tracker</h3>
      <table className="w-full text-sm">
        <thead className="text-left text-slate-500">
          <tr><th className="py-1">Keyword</th><th>Avg</th><th>Now</th><th>Prev</th><th>Delta</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.keyword} className="border-t border-surface-border">
              <td className="py-2">{r.keyword}</td>
              <td>{r.avgRank?.toFixed(1) ?? "n/a"}</td>
              <td>{r.current ?? "20+"}</td>
              <td>{r.previous ?? "n/a"}</td>
              <td><RankDelta delta={r.delta} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
