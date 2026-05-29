import type { GridPoint } from "@/lib/types";

export interface GridConfig {
  centerLat: number;
  centerLng: number;
  radiusMiles: number;
  size: number;
  zoom: string;
}

const MILES_PER_DEG_LAT = 69.0;

export function generateGrid(cfg: GridConfig): GridPoint[] {
  const { centerLat, centerLng, radiusMiles, size } = cfg;
  const milesPerDegLng = MILES_PER_DEG_LAT * Math.cos((centerLat * Math.PI) / 180);
  const latSpan = radiusMiles / MILES_PER_DEG_LAT; // degrees from center to edge
  const lngSpan = radiusMiles / milesPerDegLng;
  const half = (size - 1) / 2;
  const points: GridPoint[] = [];
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      // row 0 = north (top), so latitude decreases as row increases
      const lat = centerLat + ((half - row) / half) * latSpan;
      const lng = centerLng + ((col - half) / half) * lngSpan;
      points.push({ row, col, lat, lng });
    }
  }
  return points;
}

export type RankBucket = "top3" | "mid" | "none";

export function rankBucket(rank: number | null): RankBucket {
  if (rank === null) return "none";
  if (rank <= 3) return "top3";
  return "mid";
}

export function locationCoordinate(p: GridPoint, zoom: string): string {
  return `${p.lat.toFixed(7)},${p.lng.toFixed(7)},${zoom}`;
}
