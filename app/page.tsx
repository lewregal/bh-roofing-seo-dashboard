import { getDashboardData } from "@/lib/data";
import { Header } from "@/components/Header";
import { MetricCards } from "@/components/MetricCards";
import { MapPack } from "@/components/MapPack";
import { TrendChart } from "@/components/TrendChart";
import { DecliningPanel } from "@/components/DecliningPanel";
import { QueriesTable } from "@/components/QueriesTable";
import { PagesTable } from "@/components/PagesTable";

export const dynamic = "force-dynamic"; // render on demand; data is cached 12h via unstable_cache in lib/data.ts

export default async function Page({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const { range } = await searchParams;
  const trendDays = [30, 60, 90].includes(Number(range)) ? Number(range) : 30;
  const todayIso = new Date().toISOString().slice(0, 10);
  const data = await getDashboardData(todayIso, trendDays);

  return (
    <main className="mx-auto max-w-7xl p-4 sm:p-6">
      <Header generatedAt={data.generatedAt} />
      <div className="space-y-6">
        <MetricCards summary={data.summary} timeseries={data.timeseries} />
        <MapPack keywords={data.map.keywords} tracker={data.map.tracker} available={data.map.available} />
        <TrendChart data={data.timeseries} />
        <DecliningPanel rows={data.declines} />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <QueriesTable rows={data.topQueries} />
          <PagesTable rows={data.topPages} />
        </div>
      </div>
    </main>
  );
}
