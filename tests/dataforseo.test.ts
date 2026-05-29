import { describe, it, expect } from "vitest";
import { findRank, topCompetitors, aggregateKeyword } from "@/lib/dataforseo";

const item = (over: Record<string, unknown>) => ({
  type: "maps_search",
  rank_group: 1,
  title: "Some Roofer",
  domain: "example.com",
  place_id: "PID_X",
  rating: { value: 4.5, votes_count: 100 },
  ...over,
});

const response = {
  tasks: [{ result: [{ items: [
    item({ rank_group: 1, title: "Acme Roofing", place_id: "PID_A", rating: { value: 4.8, votes_count: 210 } }),
    item({ rank_group: 2, title: "BH Roofing", place_id: "PID_BH", domain: "bhroofingsa.com", rating: { value: 5.0, votes_count: 461 } }),
    item({ rank_group: 3, title: "Maps Paid", type: "maps_paid_item" }),
    item({ rank_group: 3, title: "Other Co", place_id: "PID_O", rating: { value: 4.1, votes_count: 30 } }),
  ] }] }],
};

describe("dataforseo parsers", () => {
  it("findRank matches BH by place_id and returns rank_group", () => {
    expect(findRank(response, { placeId: "PID_BH", nameMatch: "bh roofing" })).toBe(2);
  });

  it("findRank falls back to name match when place_id empty", () => {
    expect(findRank(response, { placeId: "", nameMatch: "bh roofing" })).toBe(2);
  });

  it("findRank returns null when business absent", () => {
    expect(findRank(response, { placeId: "PID_NONE", nameMatch: "nobody" })).toBeNull();
  });

  it("topCompetitors excludes paid items and the target, limit applied", () => {
    const c = topCompetitors(response, { placeId: "PID_BH", nameMatch: "bh roofing" }, 3);
    expect(c.map((x) => x.title)).toEqual(["Acme Roofing", "Other Co"]);
    expect(c[0]).toEqual({ title: "Acme Roofing", rank: 1, rating: 4.8, reviews: 210 });
  });

  it("aggregateKeyword computes avgRank and pctTop3 over grid", () => {
    const r = aggregateKeyword("roof repair", [
      { point: { row: 0, col: 0, lat: 0, lng: 0 }, rank: 1 },
      { point: { row: 0, col: 1, lat: 0, lng: 0 }, rank: 5 },
      { point: { row: 0, col: 2, lat: 0, lng: 0 }, rank: null },
    ], []);
    expect(r.avgRank).toBeCloseTo(3); // (1+5)/2
    expect(r.pctTop3).toBeCloseTo(1 / 3);
  });
});
