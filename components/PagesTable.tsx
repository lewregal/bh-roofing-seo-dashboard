import { Card } from "@/components/ui/Card";
import type { PageRow } from "@/lib/types";

function shortPath(url: string) {
  try { return new URL(url).pathname || "/"; } catch { return url; }
}

export function PagesTable({ rows }: { rows: PageRow[] }) {
  return (
    <Card>
      <h2 className="mb-3 text-lg font-semibold">Top 10 pages</h2>
      <table className="w-full text-sm">
        <thead className="text-left text-slate-500">
          <tr><th className="py-1">Page</th><th>Clicks</th><th>Impr</th><th>CTR</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.page} className="border-t border-surface-border">
              <td className="py-2 pr-3 text-accent">{shortPath(r.page)}</td>
              <td>{r.clicks}</td>
              <td>{r.impressions}</td>
              <td>{(r.ctr * 100).toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
