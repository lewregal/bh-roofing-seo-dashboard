import { put, list, del } from "@vercel/blob";
import type {
  KeywordMapResult, MapSnapshot, MapTrackerRow, MapTrendPoint,
} from "@/lib/types";

export function centerRank(k: KeywordMapResult): number | null {
  const c = k.grid.find((g) => g.point.row === 2 && g.point.col === 2);
  return c ? c.rank : null;
}

export function buildTracker(latest: MapSnapshot, previous: MapSnapshot | null): MapTrackerRow[] {
  const prevByKw = new Map((previous?.keywords ?? []).map((k) => [k.keyword, centerRank(k)]));
  return latest.keywords.map((k) => {
    const current = centerRank(k);
    const prev = prevByKw.has(k.keyword) ? prevByKw.get(k.keyword)! : null;
    const delta = current !== null && prev !== null ? prev - current : null;
    return { keyword: k.keyword, avgRank: k.avgRank, current, previous: prev, delta };
  });
}

export function buildTrends(history: MapSnapshot[]): Record<string, MapTrendPoint[]> {
  const out: Record<string, MapTrendPoint[]> = {};
  for (const snap of [...history].sort((a, b) => a.capturedAt.localeCompare(b.capturedAt))) {
    const date = snap.capturedAt.slice(0, 10);
    for (const k of snap.keywords) {
      (out[k.keyword] ??= []).push({ date, avgRank: k.avgRank });
    }
  }
  return out;
}

const PREFIX = "snapshots/";
const KEEP = 100;

export async function writeSnapshot(snapshot: MapSnapshot): Promise<void> {
  const key = `${PREFIX}${snapshot.capturedAt}.json`;
  await put(key, JSON.stringify(snapshot), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
  });
}

export async function listSnapshots(): Promise<MapSnapshot[]> {
  const { blobs } = await list({ prefix: PREFIX });
  const sorted = blobs.sort((a, b) => a.pathname.localeCompare(b.pathname));
  const recent = sorted.slice(-KEEP);
  const out: MapSnapshot[] = [];
  for (const b of recent) {
    const res = await fetch(b.url);
    if (res.ok) out.push((await res.json()) as MapSnapshot);
  }
  return out.sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
}

export async function pruneSnapshots(): Promise<void> {
  const { blobs } = await list({ prefix: PREFIX });
  const sorted = blobs.sort((a, b) => a.pathname.localeCompare(b.pathname));
  const stale = sorted.slice(0, Math.max(0, sorted.length - KEEP));
  if (stale.length) await del(stale.map((b) => b.url));
}
