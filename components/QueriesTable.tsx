import { Card } from "@/components/ui/Card";
import type { QueryRow } from "@/lib/types";

export function QueriesTable({ rows }: { rows: QueryRow[] }) {
  return (
    <Card>
      <h2 className="mb-3 text-lg font-semibold">Top 20 queries</h2>
      <table className="w-full text-sm">
        <thead className="text-left text-slate-500">
          <tr><th className="py-1">Query</th><th>Clicks</th><th>Impr</th><th>CTR</th><th>Pos</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.query} className="border-t border-surface-border">
              <td className="py-2 pr-3">{r.query}</td>
              <td>{r.clicks}</td>
              <td>{r.impressions}</td>
              <td>{(r.ctr * 100).toFixed(1)}%</td>
              <td>{r.position.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
