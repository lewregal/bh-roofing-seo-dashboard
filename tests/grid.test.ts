import { describe, it, expect } from "vitest";
import { generateGrid, rankBucket, locationCoordinate } from "@/lib/grid";

describe("grid", () => {
  it("generates size*size points centered on center", () => {
    const pts = generateGrid({ centerLat: 29.5, centerLng: -98.4, radiusMiles: 12, size: 5, zoom: "13z" });
    expect(pts).toHaveLength(25);
    const center = pts.find((p) => p.row === 2 && p.col === 2)!;
    expect(center.lat).toBeCloseTo(29.5, 4);
    expect(center.lng).toBeCloseTo(-98.4, 4);
  });

  it("spreads latitude across the radius (top row north of center)", () => {
    const pts = generateGrid({ centerLat: 29.5, centerLng: -98.4, radiusMiles: 12, size: 5, zoom: "13z" });
    const top = pts.find((p) => p.row === 0 && p.col === 2)!;
    const bottom = pts.find((p) => p.row === 4 && p.col === 2)!;
    expect(top.lat).toBeGreaterThan(center(pts).lat);
    expect(bottom.lat).toBeLessThan(center(pts).lat);
  });

  it("rankBucket classifies rank into top3/mid/none", () => {
    expect(rankBucket(1)).toBe("top3");
    expect(rankBucket(3)).toBe("top3");
    expect(rankBucket(4)).toBe("mid");
    expect(rankBucket(10)).toBe("mid");
    expect(rankBucket(null)).toBe("none");
  });

  it("locationCoordinate formats lat,lng,zoom with 7 decimals", () => {
    expect(locationCoordinate({ row: 0, col: 0, lat: 29.5916123456, lng: -98.4366 }, "13z"))
      .toBe("29.5916123,-98.4366000,13z");
  });
});

function center(pts: { row: number; col: number; lat: number }[]) {
  return pts.find((p) => p.row === 2 && p.col === 2)!;
}
