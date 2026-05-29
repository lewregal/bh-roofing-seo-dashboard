"use client";
import { useRouter, useSearchParams } from "next/navigation";

const RANGES = [30, 60, 90];

export function DateRangePicker() {
  const router = useRouter();
  const params = useSearchParams();
  const current = Number(params.get("range") ?? 30);
  return (
    <div className="flex gap-1">
      {RANGES.map((r) => (
        <button
          key={r}
          onClick={() => router.push(`/?range=${r}`)}
          className={`rounded-md px-3 py-1 text-sm ${current === r ? "bg-accent text-white" : "border border-surface-border text-slate-400"}`}
        >
          {r}d
        </button>
      ))}
    </div>
  );
}
