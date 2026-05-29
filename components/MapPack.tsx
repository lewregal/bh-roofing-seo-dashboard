"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import { Card } from "@/components/ui/Card";
import { CompetitorList } from "@/components/CompetitorList";
import { LocalRankTable } from "@/components/LocalRankTable";
import type { KeywordMapResult, MapTrackerRow } from "@/lib/types";
import { GRID } from "@/config/grid";

const GeoGridMap = dynamic(() => import("@/components/GeoGridMap").then((m) => m.GeoGridMap), { ssr: false });

export function MapPack({
  keywords, tracker, available,
}: { keywords: KeywordMapResult[]; tracker: MapTrackerRow[]; available: boolean }) {
  const [selected, setSelected] = useState(0);
  if (!available || keywords.length === 0) {
    return <Card><p className="text-slate-400">Map pack data is not available yet. It populates after the first nightly scan.</p></Card>;
  }
  const k = keywords[selected];
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Google Map Pack</h2>
        <select
          value={selected}
          onChange={(e) => setSelected(Number(e.target.value))}
          className="rounded-md border border-surface-border bg-surface-card px-3 py-1 text-sm"
        >
          {keywords.map((kw, i) => <option key={kw.keyword} value={i}>{kw.keyword}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-2">
          <div className="flex gap-6 text-sm text-slate-300">
            <span>Avg map rank: <b>{k.avgRank?.toFixed(1) ?? "n/a"}</b></span>
            <span>In top 3: <b>{Math.round(k.pctTop3 * 100)}%</b></span>
          </div>
          <GeoGridMap grid={k.grid} center={[GRID.centerLat, GRID.centerLng]} />
        </div>
        <CompetitorList competitors={k.competitors} />
      </div>
      <LocalRankTable rows={tracker} />
    </section>
  );
}
