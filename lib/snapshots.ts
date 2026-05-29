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
