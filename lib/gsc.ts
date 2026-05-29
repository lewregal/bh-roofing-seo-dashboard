import type {
  MetricSummary, SummaryWithDelta, TimeseriesPoint, QueryRow, PageRow, DeclineRow,
} from "@/lib/types";
import { google } from "googleapis";
import { SITE } from "@/config/site";

export interface GscRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export function pctChange(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / previous) * 100;
}

export function summarize(rows: GscRow[]): MetricSummary {
  let clicks = 0, impressions = 0, posWeighted = 0, ctrWeighted = 0;
  for (const r of rows) {
    clicks += r.clicks;
    impressions += r.impressions;
    posWeighted += r.position * r.impressions;
    ctrWeighted += r.ctr * r.impressions;
  }
  return {
    clicks,
    impressions,
    ctr: impressions ? ctrWeighted / impressions : 0,
    position: impressions ? posWeighted / impressions : 0,
  };
}

export function summaryWithDelta(current: MetricSummary, previous: MetricSummary): SummaryWithDelta {
  return {
    current,
    previous,
    changePct: {
      clicks: pctChange(current.clicks, previous.clicks),
      impressions: pctChange(current.impressions, previous.impressions),
      ctr: pctChange(current.ctr, previous.ctr),
      position: pctChange(current.position, previous.position),
    },
  };
}

export function toTimeseries(rows: GscRow[]): TimeseriesPoint[] {
  return rows
    .map((r) => ({
      date: r.keys[0],
      clicks: r.clicks,
      impressions: r.impressions,
      ctr: r.ctr,
      position: r.position,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function toQueryRows(rows: GscRow[], limit: number): QueryRow[] {
  return [...rows]
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, limit)
    .map((r) => ({
      query: r.keys[0],
      clicks: r.clicks,
      impressions: r.impressions,
      ctr: r.ctr,
      position: r.position,
    }));
}

export function toPageRows(rows: GscRow[], limit: number): PageRow[] {
  return [...rows]
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, limit)
    .map((r) => ({
      page: r.keys[0],
      clicks: r.clicks,
      impressions: r.impressions,
      ctr: r.ctr,
      position: r.position,
    }));
}

// Higher position number = worse rank. delta = recent - prior; positive = worsened.
export function detectDeclines(recent: GscRow[], prior: GscRow[], threshold: number): DeclineRow[] {
  const priorByKey = new Map(prior.map((r) => [r.keys[0], r.position]));
  const out: DeclineRow[] = [];
  for (const r of recent) {
    const key = r.keys[0];
    const priorPosition = priorByKey.get(key);
    if (priorPosition === undefined) continue;
    const delta = r.position - priorPosition;
    if (delta >= threshold) {
      out.push({ key, recentPosition: r.position, priorPosition, delta });
    }
  }
  return out.sort((a, b) => b.delta - a.delta);
}

function getClient() {
  const raw = process.env.GSC_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("GSC_SERVICE_ACCOUNT_JSON is not set");
  const credentials = JSON.parse(raw);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
  });
  return google.webmasters({ version: "v3", auth });
}

export interface GscQueryOptions {
  startDate: string;
  endDate: string;
  dimensions: string[];
  rowLimit?: number;
}

export async function queryGsc(opts: GscQueryOptions): Promise<GscRow[]> {
  const wm = getClient();
  const res = await wm.searchanalytics.query({
    siteUrl: SITE.gscSiteUrl,
    requestBody: {
      startDate: opts.startDate,
      endDate: opts.endDate,
      dimensions: opts.dimensions,
      rowLimit: opts.rowLimit ?? 1000,
    },
  });
  return (res.data.rows ?? []) as GscRow[];
}
