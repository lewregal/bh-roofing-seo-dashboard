import { Card } from "@/components/ui/Card";
import { Star } from "lucide-react";
import type { Competitor } from "@/lib/types";

export function CompetitorList({ competitors }: { competitors: Competitor[] }) {
  return (
    <Card>
      <h3 className="mb-3 text-sm font-semibold text-slate-300">Who is in the pack</h3>
      <ul className="space-y-2">
        {competitors.length === 0 && <li className="text-sm text-slate-500">No competitor data.</li>}
        {competitors.map((c) => (
          <li key={c.title} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <span className="w-5 text-slate-500">{c.rank}</span>
              <span>{c.title}</span>
            </span>
            <span className="flex items-center gap-1 text-slate-400">
              <Star className="h-3 w-3 text-yellow-500" />
              {c.rating ?? "n/a"} ({c.reviews ?? 0})
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
