import { ArrowUp, ArrowDown } from "lucide-react";

export function Delta({ pct, lowerIsBetter = false }: { pct: number; lowerIsBetter?: boolean }) {
  const improved = lowerIsBetter ? pct < 0 : pct > 0;
  const color = pct === 0 ? "text-slate-400" : improved ? "text-good" : "text-bad";
  const Icon = pct >= 0 ? ArrowUp : ArrowDown;
  return (
    <span className={`inline-flex items-center gap-1 text-sm font-medium ${color}`}>
      <Icon className="h-3 w-3" />
      {Math.abs(pct).toFixed(1)}%
    </span>
  );
}
