import { describe, it, expect } from "vitest";
import {
  pctChange, summarize, summaryWithDelta, toTimeseries, toQueryRows, toPageRows,
} from "@/lib/gsc";

const rows = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    keys: [`q${i}`],
    clicks: i + 1,
    impressions: (i + 1) * 10,
    ctr: 0.1,
    position: i + 1,
  }));

describe("gsc transforms", () => {
  it("pctChange handles normal and zero-base", () => {
    expect(pctChange(110, 100)).toBeCloseTo(10);
    expect(pctChange(5, 0)).toBe(100);
    expect(pctChange(0, 0)).toBe(0);
  });

  it("summarize aggregates clicks/impressions and weights ctr/position by impressions", () => {
    const s = summarize([
      { keys: [], clicks: 10, impressions: 100, ctr: 0.1, position: 2 },
      { keys: [], clicks: 30, impressions: 300, ctr: 0.1, position: 6 },
    ]);
    expect(s.clicks).toBe(40);
    expect(s.impressions).toBe(400);
    expect(s.ctr).toBeCloseTo(0.1);
    expect(s.position).toBeCloseTo(5); // (2*100 + 6*300)/400
  });

  it("summaryWithDelta computes percent changes", () => {
    const cur = { clicks: 165, impressions: 36200, ctr: 0.005, position: 25.6 };
    const prev = { clicks: 125, impressions: 49700, ctr: 0.003, position: 27.9 };
    const d = summaryWithDelta(cur, prev);
    expect(d.changePct.clicks).toBeCloseTo(32, 0);
    expect(d.changePct.impressions).toBeLessThan(0);
  });

  it("toTimeseries maps date-keyed rows", () => {
    const ts = toTimeseries([
      { keys: ["2026-05-01"], clicks: 3, impressions: 30, ctr: 0.1, position: 4 },
    ]);
    expect(ts[0]).toEqual({ date: "2026-05-01", clicks: 3, impressions: 30, ctr: 0.1, position: 4 });
  });

  it("toQueryRows takes top N by clicks descending", () => {
    const qr = toQueryRows(rows(25), 20);
    expect(qr).toHaveLength(20);
    expect(qr[0].query).toBe("q24");
    expect(qr[0].clicks).toBe(25);
  });

  it("toPageRows takes top N by clicks descending", () => {
    const pr = toPageRows(rows(15), 10);
    expect(pr).toHaveLength(10);
    expect(pr[0].page).toBe("q14");
  });
});
