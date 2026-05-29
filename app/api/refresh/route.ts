import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { SITE } from "@/config/site";
import { GRID } from "@/config/grid";
import { KEYWORDS, GRID_KEYWORD_COUNT } from "@/config/keywords";
import { generateGrid } from "@/lib/grid";
import { scanKeyword, aggregateKeyword } from "@/lib/dataforseo";
import { writeSnapshot, pruneSnapshots } from "@/lib/snapshots";
import type { MapSnapshot, KeywordMapResult } from "@/lib/types";

export const maxDuration = 300; // seconds (Vercel function limit)
export const dynamic = "force-dynamic";

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const points = generateGrid(GRID);
  const match = { placeId: SITE.placeId, nameMatch: SITE.nameMatch };
  const keywords: KeywordMapResult[] = [];
  for (const keyword of KEYWORDS.slice(0, GRID_KEYWORD_COUNT)) {
    const { grid, competitors } = await scanKeyword(keyword, points, GRID.zoom, match);
    keywords.push(aggregateKeyword(keyword, grid, competitors));
  }
  const snapshot: MapSnapshot = { capturedAt: new Date().toISOString(), keywords };
  await writeSnapshot(snapshot);
  await pruneSnapshots();
  revalidateTag("dashboard");
  return NextResponse.json({ ok: true, keywords: keywords.length, capturedAt: snapshot.capturedAt });
}
