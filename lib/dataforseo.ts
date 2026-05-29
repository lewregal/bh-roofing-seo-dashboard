import type { Competitor, GridPoint, GridResult, KeywordMapResult } from "@/lib/types";
import { locationCoordinate } from "@/lib/grid";
import pLimit from "p-limit";

export interface MatchConfig { placeId: string; nameMatch: string; }

interface MapsItem {
  type?: string;
  rank_group?: number;
  title?: string;
  domain?: string;
  place_id?: string;
  cid?: string;
  rating?: { value?: number; votes_count?: number } | null;
}

export function extractItems(response: unknown): MapsItem[] {
  const r = response as { tasks?: Array<{ result?: Array<{ items?: MapsItem[] }> }> };
  return r?.tasks?.[0]?.result?.[0]?.items ?? [];
}

function isOrganic(it: MapsItem): boolean {
  return it.type === "maps_search";
}

function matchesTarget(it: MapsItem, cfg: MatchConfig): boolean {
  if (cfg.placeId && (it.place_id === cfg.placeId || it.cid === cfg.placeId)) return true;
  const name = (it.title ?? "").toLowerCase();
  if (cfg.nameMatch && name.includes(cfg.nameMatch.toLowerCase())) return true;
  return false;
}

export function findRank(response: unknown, cfg: MatchConfig): number | null {
  const match = extractItems(response).filter(isOrganic).find((it) => matchesTarget(it, cfg));
  return match?.rank_group ?? null;
}

export function topCompetitors(response: unknown, cfg: MatchConfig, limit: number): Competitor[] {
  return extractItems(response)
    .filter(isOrganic)
    .filter((it) => !matchesTarget(it, cfg))
    .slice(0, limit)
    .map((it) => ({
      title: it.title ?? "Unknown",
      rank: it.rank_group ?? 0,
      rating: it.rating?.value ?? null,
      reviews: it.rating?.votes_count ?? null,
    }));
}

export function aggregateKeyword(
  keyword: string,
  grid: GridResult[],
  competitors: Competitor[],
): KeywordMapResult {
  const ranks = grid.map((g) => g.rank).filter((r): r is number => r !== null);
  const avgRank = ranks.length ? ranks.reduce((a, b) => a + b, 0) / ranks.length : null;
  const top3 = grid.filter((g) => g.rank !== null && g.rank <= 3).length;
  const pctTop3 = grid.length ? top3 / grid.length : 0;
  return { keyword, grid, avgRank, pctTop3, competitors };
}

// Task 8: Live query + grid scan

const ENDPOINT = "https://api.dataforseo.com/v3/serp/google/maps/live/advanced";

function authHeader(): string {
  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;
  if (!login || !password) throw new Error("DATAFORSEO_LOGIN / DATAFORSEO_PASSWORD not set");
  return "Basic " + Buffer.from(`${login}:${password}`).toString("base64");
}

async function mapsQuery(keyword: string, coordinate: string): Promise<unknown> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { Authorization: authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify([
      { keyword, location_coordinate: coordinate, language_code: "en", device: "desktop", depth: 100 },
    ]),
  });
  if (!res.ok) throw new Error(`DataForSEO ${res.status}`);
  return res.json();
}

// Scan one keyword across all grid points. Returns per-point ranks plus
// competitors taken from the center point. Failed points become rank: null.
export async function scanKeyword(
  keyword: string,
  points: GridPoint[],
  zoom: string,
  cfg: MatchConfig,
): Promise<{ grid: GridResult[]; competitors: Competitor[] }> {
  const limit = pLimit(20); // under the 30-thread DataForSEO ceiling
  const centerRow = points.reduce((m, p) => Math.max(m, p.row), 0) / 2;
  let competitors: Competitor[] = [];
  const grid = await Promise.all(
    points.map((point) =>
      limit(async () => {
        try {
          const resp = await mapsQuery(keyword, locationCoordinate(point, zoom));
          if (point.row === centerRow && point.col === centerRow) {
            competitors = topCompetitors(resp, cfg, 3);
          }
          return { point, rank: findRank(resp, cfg) } satisfies GridResult;
        } catch {
          return { point, rank: null } satisfies GridResult;
        }
      }),
    ),
  );
  return { grid, competitors };
}
