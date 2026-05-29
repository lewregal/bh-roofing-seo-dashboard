import { unstable_cache } from "next/cache";
import { SITE } from "@/config/site";
import { comparePeriods, lastNDays } from "@/lib/dates";
import {
  queryGsc, summarize, summaryWithDelta, toTimeseries, toQueryRows, toPageRows, detectDeclines,
} from "@/lib/gsc";
import { listSnapshots, buildTracker, buildTrends } from "@/lib/snapshots";
import type { DashboardData } from "@/lib/types";

const HALF_DAY = 60 * 60 * 12;

async function loadGsc(todayIso: string, trendDays: number) {
  const cmp = comparePeriods(todayIso, SITE.dataLagDays, 28);
  const trendWindow = lastNDays(todayIso, SITE.dataLagDays, trendDays);
  const priorTrend = lastNDays(addDaysStr(trendWindow.start, -1), 0, trendDays);

  const toOpts = (w: { start: string; end: string }, dims: string[], limit: number) =>
    ({ startDate: w.start, endDate: w.end, dimensions: dims, rowLimit: limit });

  const [curRows, prevRows, tsRows, queryRows, pageRows, recentForDecline, priorForDecline] =
    await Promise.all([
      queryGsc(toOpts(cmp.current, [], 1)),
      queryGsc(toOpts(cmp.previous, [], 1)),
      queryGsc(toOpts(trendWindow, ["date"], 1000)),
      queryGsc(toOpts(trendWindow, ["query"], 1000)),
      queryGsc(toOpts(trendWindow, ["page"], 1000)),
      queryGsc(toOpts(trendWindow, ["page"], 1000)),
      queryGsc(toOpts(priorTrend, ["page"], 1000)),
    ]);

  return {
    summary: summaryWithDelta(summarize(curRows), summarize(prevRows)),
    timeseries: toTimeseries(tsRows),
    topQueries: toQueryRows(queryRows, 20),
    topPages: toPageRows(pageRows, 10),
    declines: detectDeclines(recentForDecline, priorForDecline, 3),
  };
}

function addDaysStr(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

async function loadMap() {
  const history = await listSnapshots();
  if (history.length === 0) {
    return { keywords: [], tracker: [], trends: {}, capturedAt: null, available: false };
  }
  const latest = history[history.length - 1];
  const previous = history.length > 1 ? history[history.length - 2] : null;
  return {
    keywords: latest.keywords,
    tracker: buildTracker(latest, previous),
    trends: buildTrends(history),
    capturedAt: latest.capturedAt,
    available: true,
  };
}

export const getDashboardData = unstable_cache(
  async (todayIso: string, trendDays: number): Promise<DashboardData> => {
    const [gsc, map] = await Promise.all([loadGsc(todayIso, trendDays), loadMap()]);
    return {
      generatedAt: new Date().toISOString(),
      summary: gsc.summary,
      timeseries: gsc.timeseries,
      topQueries: gsc.topQueries,
      topPages: gsc.topPages,
      declines: gsc.declines,
      map,
    };
  },
  ["dashboard-data"],
  { revalidate: HALF_DAY, tags: ["dashboard"] },
);
