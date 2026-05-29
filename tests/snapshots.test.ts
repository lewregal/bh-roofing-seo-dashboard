import { describe, it, expect } from "vitest";
import { centerRank, buildTracker, buildTrends } from "@/lib/snapshots";
import type { MapSnapshot } from "@/lib/types";

const kw = (keyword: string, centerRankVal: number | null, avg: number | null) => ({
  keyword,
  grid: [{ point: { row: 2, col: 2, lat: 0, lng: 0 }, rank: centerRankVal }],
  avgRank: avg,
  pctTop3: 0,
  competitors: [],
});

const snap = (capturedAt: string, ...keywords: ReturnType<typeof kw>[]): MapSnapshot => ({
  capturedAt, keywords,
});

describe("snapshots", () => {
  it("centerRank reads the row==col==2 grid point", () => {
    expect(centerRank(kw("x", 4, 4))).toBe(4);
  });

  it("buildTracker computes delta = previous - current (positive = improved)", () => {
    const latest = snap("2026-05-28T00:00:00Z", kw("roof repair", 2, 2.5));
    const prev = snap("2026-05-27T00:00:00Z", kw("roof repair", 5, 6));
    const t = buildTracker(latest, prev);
    expect(t[0]).toEqual({ keyword: "roof repair", avgRank: 2.5, current: 2, previous: 5, delta: 3 });
  });

  it("buildTracker handles missing previous (delta null)", () => {
    const t = buildTracker(snap("d", kw("k", 3, 3)), null);
    expect(t[0].delta).toBeNull();
    expect(t[0].previous).toBeNull();
  });

  it("buildTrends groups avgRank by date per keyword", () => {
    const history = [
      snap("2026-05-26T00:00:00Z", kw("k", 4, 4)),
      snap("2026-05-27T00:00:00Z", kw("k", 3, 3)),
    ];
    const tr = buildTrends(history);
    expect(tr["k"]).toEqual([
      { date: "2026-05-26", avgRank: 4 },
      { date: "2026-05-27", avgRank: 3 },
    ]);
  });
});
