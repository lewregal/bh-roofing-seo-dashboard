import { Suspense } from "react";
import { DateRangePicker } from "@/components/DateRangePicker";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SITE } from "@/config/site";

export function Header({ generatedAt }: { generatedAt: string }) {
  const updated = new Date(generatedAt).toLocaleString("en-US", { timeZone: "America/Chicago" });
  return (
    <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold">BH Roofing SEO Dashboard</h1>
        <p className="text-sm text-slate-400">{SITE.domain} · Updated {updated} CT</p>
      </div>
      <div className="flex items-center gap-3">
        <Suspense fallback={null}><DateRangePicker /></Suspense>
        <ThemeToggle />
      </div>
    </header>
  );
}
