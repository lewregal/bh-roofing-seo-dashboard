import { Card } from "@/components/ui/Card";
import { TrendingDown } from "lucide-react";
import type { DeclineRow } from "@/lib/types";

export function DecliningPanel({ rows }: { rows: DeclineRow[] }) {
  return (
    <Card>
      <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
        <TrendingDown className="h-4 w-4 text-bad" /> Declining rankings
      </h2>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-500">No pages dropped past the threshold this period.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {rows.slice(0, 10).map((r) => (
            <li key={r.key} className="flex items-center justify-between border-t border-surface-border pt-2">
              <span className="truncate pr-3 text-slate-300">{r.key}</span>
              <span className="text-bad">
                {r.priorPosition.toFixed(1)} to {r.recentPosition.toFixed(1)} (+{r.delta.toFixed(1)})
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
