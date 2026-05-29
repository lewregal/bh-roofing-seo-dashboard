# BH Roofing Live SEO Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a public, no-login Next.js dashboard for bhroofingsa.com that shows Google Search Console organic performance plus a Google Map Pack geo-grid heatmap (DataForSEO), deployed on Vercel free tier.

**Architecture:** Next.js App Router app. Pure data libraries (`lib/*`) fetch and transform GSC + DataForSEO data and are unit-tested with mocked responses; React server/client components render them. The Maps geo-grid has no historical API, so a nightly Vercel Cron route fetches the grid and writes a timestamped JSON snapshot to Vercel Blob; the dashboard reads recent snapshots to compute deltas and trends. ISR caching keeps public visits from re-hitting paid APIs.

**Tech Stack:** Next.js (App Router) + TypeScript, Tailwind CSS, Recharts, react-leaflet + OpenStreetMap, lucide-react, googleapis (GSC service account), @vercel/blob, p-limit, Vitest + Testing Library.

**Reference doc:** `docs/superpowers/specs/2026-05-28-bh-roofing-seo-dashboard-design.md`

---

## File Structure

```
SEO Dashboard/
  package.json, tsconfig.json, next.config.mjs, postcss.config.mjs,
  tailwind.config.ts, vitest.config.ts, vitest.setup.ts, .env.example,
  vercel.json, .gitignore, README.md
  config/
    site.ts            # domain, GSC site url, brand constants, refresh windows
    keywords.ts        # editable target keyword list (auto-seeded once)
    grid.ts            # geo-grid center/radius/size config
  lib/
    types.ts           # shared TypeScript interfaces (the data contract)
    dates.ts           # date-range math (28d vs prev 28d, N-day windows)
    gsc.ts             # GSC client + pure transforms (summary delta, timeseries, top rows, declines)
    dataforseo.ts      # Maps SERP client + pure parsers (rank, competitors)
    grid.ts            # geo-grid coordinate generation + heatmap bucketing
    snapshots.ts       # Vercel Blob read/write/prune + map delta/trend computation
    data.ts            # cached aggregation layer the page consumes
  app/
    layout.tsx, globals.css, page.tsx
    api/refresh/route.ts   # cron-triggered refresh, CRON_SECRET guarded
  components/
    Header.tsx, DateRangePicker.tsx, ThemeToggle.tsx,
    MetricCards.tsx, TrendChart.tsx,
    MapPack.tsx, GeoGridMap.tsx, CompetitorList.tsx, LocalRankTable.tsx,
    DecliningPanel.tsx, QueriesTable.tsx, PagesTable.tsx,
    ui/Card.tsx, ui/Delta.tsx, ui/Sparkline.tsx
  tests/
    dates.test.ts, gsc.test.ts, dataforseo.test.ts, grid.test.ts,
    snapshots.test.ts, delta.test.tsx
```

**Boundary rule:** every `lib/*` function takes data/config/credentials in and returns plain typed data (no React, no DOM). Components take typed props. This keeps the data core testable independent of rendering.

---

## Phase 0: Scaffolding

### Task 0: Project scaffold, dependencies, tooling

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.mjs`, `postcss.config.mjs`, `tailwind.config.ts`, `vitest.config.ts`, `vitest.setup.ts`, `.gitignore`, `app/globals.css`, `app/layout.tsx`, `app/page.tsx`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "bh-roofing-seo-dashboard",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "next": "15.1.6",
    "react": "19.0.0",
    "react-dom": "19.0.0",
    "googleapis": "144.0.0",
    "@vercel/blob": "0.27.0",
    "recharts": "2.15.0",
    "react-leaflet": "4.2.1",
    "leaflet": "1.9.4",
    "lucide-react": "0.474.0",
    "p-limit": "6.2.0"
  },
  "devDependencies": {
    "typescript": "5.7.3",
    "@types/node": "22.10.7",
    "@types/react": "19.0.7",
    "@types/react-dom": "19.0.3",
    "@types/leaflet": "1.9.16",
    "tailwindcss": "3.4.17",
    "postcss": "8.5.1",
    "autoprefixer": "10.4.20",
    "vitest": "2.1.8",
    "@vitejs/plugin-react": "4.3.4",
    "@testing-library/react": "16.1.0",
    "@testing-library/jest-dom": "6.6.3",
    "jsdom": "25.0.1"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run: `npm install`
Expected: completes, creates `node_modules` and `package-lock.json`. (react-leaflet 4.x peer-warns on React 19; that is fine.)

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "ES2022"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Create next.config.mjs, postcss.config.mjs, .gitignore**

`next.config.mjs`:
```js
/** @type {import('next').NextConfig} */
const nextConfig = {};
export default nextConfig;
```

`postcss.config.mjs`:
```js
export default { plugins: { tailwindcss: {}, autoprefixer: {} } };
```

`.gitignore`:
```
node_modules
.next
.env
.env.local
*.tsbuildinfo
next-env.d.ts
coverage
```

- [ ] **Step 5: Create tailwind.config.ts with BH brand theme**

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: "#0B2545",
        surface: { DEFAULT: "#0f1626", card: "#151d30", border: "#243049" },
        good: "#22c55e",
        bad: "#ef4444",
        accent: "#3b82f6",
      },
    },
  },
  plugins: [],
};
export default config;
```

- [ ] **Step 6: Create app/globals.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html { color-scheme: dark; }
body { @apply bg-surface text-slate-100; }
.light body { @apply bg-slate-50 text-slate-900; }
```

- [ ] **Step 7: Create app/layout.tsx (dark default)**

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BH Roofing SEO Dashboard",
  description: "Live search performance and map pack rankings for bhroofingsa.com",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 8: Create a placeholder app/page.tsx**

```tsx
export default function Page() {
  return <main className="p-8 text-2xl">BH Roofing SEO Dashboard</main>;
}
```

- [ ] **Step 9: Create vitest.config.ts and vitest.setup.ts**

`vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  test: { environment: "jsdom", setupFiles: ["./vitest.setup.ts"], globals: true },
  resolve: { alias: { "@": fileURLToPath(new URL("./", import.meta.url)) } },
});
```

`vitest.setup.ts`:
```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 10: Verify dev server and test runner boot**

Run: `npm run build`
Expected: build succeeds (compiles the placeholder page).
Run: `npx vitest run`
Expected: "No test files found" (exit 0) — runner works.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js app with Tailwind, Vitest, brand theme"
```

---

## Phase 1: Configuration and shared types

### Task 1: Shared types and site/grid/keyword config

**Files:**
- Create: `lib/types.ts`, `config/site.ts`, `config/grid.ts`, `config/keywords.ts`

- [ ] **Step 1: Create lib/types.ts (the data contract used by every later task)**

```ts
// Organic / GSC
export interface MetricSummary {
  clicks: number;
  impressions: number;
  ctr: number; // 0..1
  position: number;
}
export interface SummaryWithDelta {
  current: MetricSummary;
  previous: MetricSummary;
  changePct: { clicks: number; impressions: number; ctr: number; position: number };
}
export interface TimeseriesPoint {
  date: string; // YYYY-MM-DD
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}
export interface QueryRow {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}
export interface PageRow {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}
export interface DeclineRow {
  key: string;
  recentPosition: number;
  priorPosition: number;
  delta: number; // positive = position worsened (got bigger)
}

// Map pack / DataForSEO
export interface GridPoint { row: number; col: number; lat: number; lng: number; }
export interface GridResult { point: GridPoint; rank: number | null; } // rank_group; null = not in pack
export interface Competitor {
  title: string;
  rank: number;
  rating: number | null;
  reviews: number | null;
}
export interface KeywordMapResult {
  keyword: string;
  grid: GridResult[];
  avgRank: number | null; // mean of non-null ranks
  pctTop3: number; // 0..1 across all grid points
  competitors: Competitor[]; // from the center grid point
}
export interface MapSnapshot {
  capturedAt: string; // ISO timestamp
  keywords: KeywordMapResult[];
}
export interface MapTrackerRow {
  keyword: string;
  avgRank: number | null;
  current: number | null; // center-point rank, latest snapshot
  previous: number | null; // center-point rank, prior snapshot
  delta: number | null; // previous - current; positive = improved (rank got smaller)
}
export interface MapTrendPoint { date: string; avgRank: number | null; }

// Whole-dashboard payload
export interface DashboardData {
  generatedAt: string;
  summary: SummaryWithDelta;
  timeseries: TimeseriesPoint[];
  topQueries: QueryRow[];
  topPages: PageRow[];
  declines: DeclineRow[];
  map: {
    keywords: KeywordMapResult[];
    tracker: MapTrackerRow[];
    trends: Record<string, MapTrendPoint[]>; // keyword -> points
    capturedAt: string | null;
    available: boolean;
  };
}
```

- [ ] **Step 2: Create config/site.ts**

```ts
export const SITE = {
  domain: "bhroofingsa.com",
  // GSC domain property. Override with env if a URL-prefix property is used instead.
  gscSiteUrl: process.env.GSC_SITE_URL ?? "sc-domain:bhroofingsa.com",
  businessName: "BH Roofing",
  // Match keys for identifying BH Roofing in DataForSEO maps results.
  // place_id is most reliable; fill it once known (see README setup).
  placeId: process.env.BH_PLACE_ID ?? "",
  nameMatch: "bh roofing",
  // GSC data lag in days (data is ~2-3 days behind).
  dataLagDays: 3,
} as const;
```

- [ ] **Step 3: Create config/grid.ts (San Antonio service area, 5x5)**

```ts
// Center: BH Roofing, 14093 Bulverde Rd, San Antonio, TX 78247 (approx).
export const GRID = {
  centerLat: 29.5916,
  centerLng: -98.4366,
  // Half-width of the grid in miles from center to edge.
  radiusMiles: 12,
  size: 5, // 5x5 = 25 points
  zoom: "13z", // DataForSEO location_coordinate zoom suffix
} as const;
```

- [ ] **Step 4: Create config/keywords.ts (editable; seeded later from GSC)**

```ts
// Target keywords for the map-pack tracker. Edit by hand any time.
// The geo-grid runs against the first GRID_KEYWORD_COUNT entries.
export const KEYWORDS: string[] = [
  "roof repair san antonio",
  "roofing contractor san antonio",
  "roof replacement san antonio",
  "storm damage roof repair san antonio",
  "emergency roof repair san antonio",
  "metal roofing san antonio",
];

// How many of the above get the full geo-grid scan (cost control).
export const GRID_KEYWORD_COUNT = 6;
```

- [ ] **Step 5: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add lib/types.ts config/
git commit -m "feat: add shared types and site/grid/keyword config"
```

---

## Phase 2: Date math (TDD)

### Task 2: Date-range helpers

**Files:**
- Create: `lib/dates.ts`
- Test: `tests/dates.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { isoDate, addDays, comparePeriods, lastNDays } from "@/lib/dates";

describe("dates", () => {
  it("isoDate formats to YYYY-MM-DD", () => {
    expect(isoDate(new Date("2026-05-28T12:00:00Z"))).toBe("2026-05-28");
  });

  it("addDays shifts and formats", () => {
    expect(addDays("2026-05-28", -3)).toBe("2026-05-25");
  });

  it("comparePeriods returns 28d current and previous windows ending at lagged today", () => {
    // today 2026-05-28, lag 3 => latest data day = 2026-05-25
    const r = comparePeriods("2026-05-28", 3, 28);
    expect(r.current.end).toBe("2026-05-25");
    expect(r.current.start).toBe("2026-04-28"); // 28 days inclusive
    expect(r.previous.end).toBe("2026-04-27");
    expect(r.previous.start).toBe("2026-03-31");
  });

  it("lastNDays returns inclusive window ending at lagged today", () => {
    const r = lastNDays("2026-05-28", 3, 30);
    expect(r.end).toBe("2026-05-25");
    expect(r.start).toBe("2026-04-26"); // 30 days inclusive
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/dates.test.ts`
Expected: FAIL — module `@/lib/dates` not found.

- [ ] **Step 3: Implement lib/dates.ts**

```ts
export interface DateWindow { start: string; end: string; }

export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return isoDate(d);
}

// Latest day with data, given today and the source lag.
export function laggedToday(todayIso: string, lagDays: number): string {
  return addDays(todayIso, -lagDays);
}

// Inclusive N-day window ending at the lagged today.
export function lastNDays(todayIso: string, lagDays: number, n: number): DateWindow {
  const end = laggedToday(todayIso, lagDays);
  const start = addDays(end, -(n - 1));
  return { start, end };
}

// Current N-day window vs the immediately preceding N-day window.
export function comparePeriods(todayIso: string, lagDays: number, n: number) {
  const current = lastNDays(todayIso, lagDays, n);
  const prevEnd = addDays(current.start, -1);
  const prevStart = addDays(prevEnd, -(n - 1));
  return { current, previous: { start: prevStart, end: prevEnd } as DateWindow };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/dates.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/dates.ts tests/dates.test.ts
git commit -m "feat: add date-range helpers with tests"
```

---

## Phase 3: GSC data library (TDD on pure transforms)

### Task 3: GSC transforms — summary delta, timeseries, top rows

**Files:**
- Create: `lib/gsc.ts`
- Test: `tests/gsc.test.ts`

GSC's `searchAnalytics.query` returns `{ rows: [{ keys: [...], clicks, impressions, ctr, position }] }`. We test pure transforms over those row shapes; the network call is a thin wrapper added in Task 5.

- [ ] **Step 1: Write the failing test**

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/gsc.test.ts`
Expected: FAIL — `@/lib/gsc` not found.

- [ ] **Step 3: Implement the pure transforms in lib/gsc.ts**

```ts
import type {
  MetricSummary, SummaryWithDelta, TimeseriesPoint, QueryRow, PageRow,
} from "@/lib/types";

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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/gsc.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/gsc.ts tests/gsc.test.ts
git commit -m "feat: add GSC pure transforms with tests"
```

### Task 4: GSC decline detection

**Files:**
- Modify: `lib/gsc.ts` (append `detectDeclines`)
- Modify: `tests/gsc.test.ts` (append decline tests)

- [ ] **Step 1: Append the failing test to tests/gsc.test.ts**

```ts
import { detectDeclines } from "@/lib/gsc";

describe("detectDeclines", () => {
  it("flags keys whose position worsened by >= threshold, sorted worst first", () => {
    const recent = [
      { keys: ["/a"], clicks: 0, impressions: 0, ctr: 0, position: 12 },
      { keys: ["/b"], clicks: 0, impressions: 0, ctr: 0, position: 4 },
      { keys: ["/c"], clicks: 0, impressions: 0, ctr: 0, position: 8 },
    ];
    const prior = [
      { keys: ["/a"], clicks: 0, impressions: 0, ctr: 0, position: 5 }, // +7 worse
      { keys: ["/b"], clicks: 0, impressions: 0, ctr: 0, position: 3 }, // +1 (ignored)
      { keys: ["/c"], clicks: 0, impressions: 0, ctr: 0, position: 3 }, // +5 worse
    ];
    const d = detectDeclines(recent, prior, 3);
    expect(d.map((x) => x.key)).toEqual(["/a", "/c"]);
    expect(d[0].delta).toBe(7);
  });

  it("ignores keys absent from either period", () => {
    const d = detectDeclines(
      [{ keys: ["/x"], clicks: 0, impressions: 0, ctr: 0, position: 20 }],
      [{ keys: ["/y"], clicks: 0, impressions: 0, ctr: 0, position: 2 }],
      3,
    );
    expect(d).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/gsc.test.ts`
Expected: FAIL — `detectDeclines` is not exported.

- [ ] **Step 3: Append detectDeclines to lib/gsc.ts**

```ts
import type { DeclineRow } from "@/lib/types";

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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/gsc.test.ts`
Expected: PASS (8 tests total).

- [ ] **Step 5: Commit**

```bash
git add lib/gsc.ts tests/gsc.test.ts
git commit -m "feat: add GSC decline detection with tests"
```

### Task 5: GSC API client wrapper

**Files:**
- Modify: `lib/gsc.ts` (append `queryGsc` network wrapper)

This thin wrapper is integration code (not unit-tested; verified manually in Phase 9). It uses the service account.

- [ ] **Step 1: Append the client to lib/gsc.ts**

```ts
import { google } from "googleapis";
import { SITE } from "@/config/site";

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
```

- [ ] **Step 2: Verify type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/gsc.ts
git commit -m "feat: add GSC service-account query client"
```

---

## Phase 4: Geo-grid generation (TDD)

### Task 6: Grid coordinate generation and heatmap bucketing

**Files:**
- Create: `lib/grid.ts`
- Test: `tests/grid.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/grid.test.ts`
Expected: FAIL — `@/lib/grid` not found.

- [ ] **Step 3: Implement lib/grid.ts**

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/grid.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/grid.ts tests/grid.test.ts
git commit -m "feat: add geo-grid generation and rank bucketing with tests"
```

---

## Phase 5: DataForSEO Maps library (TDD on parsers)

### Task 7: DataForSEO response parsers

**Files:**
- Create: `lib/dataforseo.ts`
- Test: `tests/dataforseo.test.ts`

Verified against docs: results at `tasks[0].result[0].items[]`; ranked entries have `type: "maps_search"`, `rank_group`, `title`, `domain`, `rating: { value, votes_count }`, `place_id`. Match BH by `place_id` (preferred) or name/domain fallback.

- [ ] **Step 1: Write the failing test**

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/dataforseo.test.ts`
Expected: FAIL — `@/lib/dataforseo` not found.

- [ ] **Step 3: Implement the parsers in lib/dataforseo.ts**

```ts
import type { Competitor, GridResult, KeywordMapResult } from "@/lib/types";

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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/dataforseo.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/dataforseo.ts tests/dataforseo.test.ts
git commit -m "feat: add DataForSEO maps parsers with tests"
```

### Task 8: DataForSEO live query + grid scan

**Files:**
- Modify: `lib/dataforseo.ts` (append network + scan functions)

Integration code (verified manually in Phase 9). Concurrency capped at 30 per the docs.

- [ ] **Step 1: Append to lib/dataforseo.ts**

```ts
import pLimit from "p-limit";
import { GridPoint } from "@/lib/types";
import { locationCoordinate } from "@/lib/grid";

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
```

- [ ] **Step 2: Verify type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/dataforseo.ts
git commit -m "feat: add DataForSEO live maps query and grid scan"
```

---

## Phase 6: Snapshots (TDD on delta/trend) + Blob storage

### Task 9: Snapshot delta and trend computation

**Files:**
- Create: `lib/snapshots.ts`
- Test: `tests/snapshots.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/snapshots.test.ts`
Expected: FAIL — `@/lib/snapshots` not found.

- [ ] **Step 3: Implement the pure functions in lib/snapshots.ts**

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/snapshots.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/snapshots.ts tests/snapshots.test.ts
git commit -m "feat: add map snapshot delta and trend computation with tests"
```

### Task 10: Vercel Blob persistence

**Files:**
- Modify: `lib/snapshots.ts` (append Blob read/write/prune)

Integration code. Snapshots stored as `snapshots/<ISO>.json`; keep ~100 most recent.

- [ ] **Step 1: Append to lib/snapshots.ts**

```ts
import { put, list, del } from "@vercel/blob";

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
```

- [ ] **Step 2: Verify type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/snapshots.ts
git commit -m "feat: add Vercel Blob snapshot persistence"
```

---

## Phase 7: Aggregation layer and refresh route

### Task 11: Cached dashboard aggregation

**Files:**
- Create: `lib/data.ts`

Pulls everything together for the page. Uses Next's `unstable_cache` for ISR-style caching so public visits do not re-hit APIs. The expensive Maps grid scan is NOT run here; the page reads the latest Blob snapshot (written by the cron). GSC reads are cheap and cached 12h.

- [ ] **Step 1: Create lib/data.ts**

```ts
import { unstable_cache } from "next/cache";
import { SITE } from "@/config/site";
import { comparePeriods, lastNDays } from "@/lib/dates";
import {
  queryGsc, summarize, summaryWithDelta, toTimeseries, toQueryRows, toPageRows, detectDeclines,
} from "@/lib/gsc";
import { listSnapshots, buildTracker, buildTrends } from "@/lib/snapshots";
import type { DashboardData } from "@/lib/types";

const HALF_DAY = 60 * 60 * 12;

async function loadGsc(todayIso: string, trendDays: number) {
  const cmp = comparePeriods(todayIso, SITE.dataLagDays, 28);
  const trendWindow = lastNDays(todayIso, SITE.dataLagDays, trendDays);
  const priorTrend = lastNDays(addDaysStr(trendWindow.start, -1), 0, trendDays);

  const [curRows, prevRows, tsRows, queryRows, pageRows, recentForDecline, priorForDecline] =
    await Promise.all([
      queryGsc({ ...cmp.current, dimensions: [], rowLimit: 1 }),
      queryGsc({ ...cmp.previous, dimensions: [], rowLimit: 1 }),
      queryGsc({ ...trendWindow, dimensions: ["date"], rowLimit: 1000 }),
      queryGsc({ ...trendWindow, dimensions: ["query"], rowLimit: 1000 }),
      queryGsc({ ...trendWindow, dimensions: ["page"], rowLimit: 1000 }),
      queryGsc({ ...trendWindow, dimensions: ["page"], rowLimit: 1000 }),
      queryGsc({ ...priorTrend, dimensions: ["page"], rowLimit: 1000 }),
    ]);

  return {
    summary: summaryWithDelta(summarize(curRows), summarize(prevRows)),
    timeseries: toTimeseries(tsRows),
    topQueries: toQueryRows(queryRows, 20),
    topPages: toPageRows(pageRows, 10),
    declines: detectDeclines(recentForDecline, priorForDecline, 3),
  };
}

function addDaysStr(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

async function loadMap() {
  const history = await listSnapshots();
  if (history.length === 0) {
    return { keywords: [], tracker: [], trends: {}, capturedAt: null, available: false };
  }
  const latest = history[history.length - 1];
  const previous = history.length > 1 ? history[history.length - 2] : null;
  return {
    keywords: latest.keywords,
    tracker: buildTracker(latest, previous),
    trends: buildTrends(history),
    capturedAt: latest.capturedAt,
    available: true,
  };
}

export const getDashboardData = unstable_cache(
  async (todayIso: string, trendDays: number): Promise<DashboardData> => {
    const [gsc, map] = await Promise.all([loadGsc(todayIso, trendDays), loadMap()]);
    return {
      generatedAt: new Date().toISOString(),
      summary: gsc.summary,
      timeseries: gsc.timeseries,
      topQueries: gsc.topQueries,
      topPages: gsc.topPages,
      declines: gsc.declines,
      map,
    };
  },
  ["dashboard-data"],
  { revalidate: HALF_DAY, tags: ["dashboard"] },
);
```

- [ ] **Step 2: Verify type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/data.ts
git commit -m "feat: add cached dashboard aggregation layer"
```

### Task 12: Cron refresh route

**Files:**
- Create: `app/api/refresh/route.ts`

Runs the expensive Maps grid scan, writes a Blob snapshot, prunes old ones, and revalidates the dashboard cache. Guarded by `CRON_SECRET`.

- [ ] **Step 1: Create app/api/refresh/route.ts**

```ts
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
```

- [ ] **Step 2: Verify type-check and build**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npm run build`
Expected: build succeeds; route `/api/refresh` appears as dynamic.

- [ ] **Step 3: Commit**

```bash
git add app/api/refresh/route.ts
git commit -m "feat: add cron refresh route for map grid snapshot"
```

---

## Phase 8: UI components

### Task 13: UI primitives — Card, Delta, Sparkline

**Files:**
- Create: `components/ui/Card.tsx`, `components/ui/Delta.tsx`, `components/ui/Sparkline.tsx`
- Test: `tests/delta.test.tsx`

`Delta` color logic is the one tricky bit (lower-is-better metrics invert), so it gets a test.

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Delta } from "@/components/ui/Delta";

describe("Delta", () => {
  it("shows green for positive change on higher-is-better metric", () => {
    render(<Delta pct={32} lowerIsBetter={false} />);
    const el = screen.getByText(/32/);
    expect(el.className).toContain("text-good");
  });

  it("shows green for negative change on lower-is-better metric (position improved)", () => {
    render(<Delta pct={-8} lowerIsBetter={true} />);
    const el = screen.getByText(/8/);
    expect(el.className).toContain("text-good");
  });

  it("shows red for positive change on lower-is-better metric (position worsened)", () => {
    render(<Delta pct={8} lowerIsBetter={true} />);
    const el = screen.getByText(/8/);
    expect(el.className).toContain("text-bad");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/delta.test.tsx`
Expected: FAIL — `@/components/ui/Delta` not found.

- [ ] **Step 3: Implement the three primitives**

`components/ui/Delta.tsx`:
```tsx
import { ArrowUp, ArrowDown } from "lucide-react";

export function Delta({ pct, lowerIsBetter = false }: { pct: number; lowerIsBetter?: boolean }) {
  const improved = lowerIsBetter ? pct < 0 : pct > 0;
  const color = pct === 0 ? "text-slate-400" : improved ? "text-good" : "text-bad";
  const Icon = pct >= 0 ? ArrowUp : ArrowDown;
  return (
    <span className={`inline-flex items-center gap-1 text-sm font-medium ${color}`}>
      <Icon className="h-3 w-3" />
      {Math.abs(pct).toFixed(1)}%
    </span>
  );
}
```

`components/ui/Card.tsx`:
```tsx
export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-surface-border bg-surface-card p-5 ${className}`}>
      {children}
    </div>
  );
}
```

`components/ui/Sparkline.tsx`:
```tsx
"use client";
import { LineChart, Line, ResponsiveContainer } from "recharts";

export function Sparkline({ data, color }: { data: number[]; color: string }) {
  const series = data.map((v, i) => ({ i, v }));
  return (
    <div className="h-12 w-24">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={series}>
          <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/delta.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add components/ui/ tests/delta.test.tsx
git commit -m "feat: add Card, Delta, Sparkline UI primitives with tests"
```

### Task 14: MetricCards

**Files:**
- Create: `components/MetricCards.tsx`

- [ ] **Step 1: Implement components/MetricCards.tsx**

```tsx
import { Card } from "@/components/ui/Card";
import { Delta } from "@/components/ui/Delta";
import { Sparkline } from "@/components/ui/Sparkline";
import type { SummaryWithDelta, TimeseriesPoint } from "@/lib/types";

function fmtInt(n: number) { return Math.round(n).toLocaleString("en-US"); }
function fmtCompact(n: number) { return Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n); }

export function MetricCards({ summary, timeseries }: { summary: SummaryWithDelta; timeseries: TimeseriesPoint[] }) {
  const cards = [
    { label: "Total Clicks", value: fmtInt(summary.current.clicks), prev: fmtInt(summary.previous.clicks),
      pct: summary.changePct.clicks, lower: false, spark: timeseries.map((t) => t.clicks), color: "#a78bfa" },
    { label: "Total Impressions", value: fmtCompact(summary.current.impressions), prev: fmtCompact(summary.previous.impressions),
      pct: summary.changePct.impressions, lower: false, spark: timeseries.map((t) => t.impressions), color: "#3b82f6" },
    { label: "Average CTR", value: `${(summary.current.ctr * 100).toFixed(1)}%`, prev: `${(summary.previous.ctr * 100).toFixed(1)}%`,
      pct: summary.changePct.ctr, lower: false, spark: timeseries.map((t) => t.ctr), color: "#eab308" },
    { label: "Average Position", value: summary.current.position.toFixed(1), prev: summary.previous.position.toFixed(1),
      pct: summary.changePct.position, lower: true, spark: timeseries.map((t) => t.position), color: "#22c55e" },
  ];
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <Card key={c.label}>
          <div className="flex items-start justify-between">
            <div className="text-3xl font-bold">{c.value}</div>
            <Delta pct={c.pct} lowerIsBetter={c.lower} />
          </div>
          <div className="mt-1 text-sm text-slate-400">{c.label}</div>
          <div className="mt-3 flex items-end justify-between">
            <div className="text-xs text-slate-500">Previous {c.prev}</div>
            <Sparkline data={c.spark} color={c.color} />
          </div>
        </Card>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Verify type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/MetricCards.tsx
git commit -m "feat: add metric cards component"
```

### Task 15: TrendChart

**Files:**
- Create: `components/TrendChart.tsx`

- [ ] **Step 1: Implement components/TrendChart.tsx**

```tsx
"use client";
import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Card } from "@/components/ui/Card";
import type { TimeseriesPoint } from "@/lib/types";

type MetricKey = "clicks" | "impressions" | "ctr" | "position";
const METRICS: { key: MetricKey; label: string; color: string }[] = [
  { key: "clicks", label: "Clicks", color: "#a78bfa" },
  { key: "impressions", label: "Impressions", color: "#3b82f6" },
  { key: "ctr", label: "CTR (%)", color: "#eab308" },
  { key: "position", label: "Avg Position", color: "#22c55e" },
];

export function TrendChart({ data }: { data: TimeseriesPoint[] }) {
  const [active, setActive] = useState<MetricKey>("clicks");
  const meta = METRICS.find((m) => m.key === active)!;
  const series = data.map((d) => ({ date: d.date, value: active === "ctr" ? d.ctr * 100 : d[active] }));
  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Performance Trends</h2>
        <div className="flex gap-2">
          {METRICS.map((m) => (
            <button
              key={m.key}
              onClick={() => setActive(m.key)}
              className={`rounded-full px-3 py-1 text-xs ${active === m.key ? "bg-accent text-white" : "bg-surface text-slate-400"}`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series}>
            <CartesianGrid strokeDasharray="3 3" stroke="#243049" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#64748b" }} minTickGap={24} />
            <YAxis tick={{ fontSize: 11, fill: "#64748b" }} reversed={active === "position"} />
            <Tooltip contentStyle={{ background: "#151d30", border: "1px solid #243049" }} />
            <Line type="monotone" dataKey="value" stroke={meta.color} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
```

- [ ] **Step 2: Verify type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/TrendChart.tsx
git commit -m "feat: add performance trend chart"
```

### Task 16: GeoGridMap (Leaflet heatmap)

**Files:**
- Create: `components/GeoGridMap.tsx`

Leaflet must render client-side only. We import react-leaflet directly in a client component and color each grid point by bucket.

- [ ] **Step 1: Implement components/GeoGridMap.tsx**

```tsx
"use client";
import { MapContainer, TileLayer, CircleMarker, Tooltip as LeafletTooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { rankBucket } from "@/lib/grid";
import type { GridResult } from "@/lib/types";

const COLORS: Record<string, string> = { top3: "#22c55e", mid: "#eab308", none: "#ef4444" };

export function GeoGridMap({ grid, center }: { grid: GridResult[]; center: [number, number] }) {
  return (
    <div className="h-96 overflow-hidden rounded-xl border border-surface-border">
      <MapContainer center={center} zoom={11} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        {grid.map((g, i) => {
          const bucket = rankBucket(g.rank);
          return (
            <CircleMarker
              key={i}
              center={[g.point.lat, g.point.lng]}
              radius={16}
              pathOptions={{ color: COLORS[bucket], fillColor: COLORS[bucket], fillOpacity: 0.55, weight: 1 }}
            >
              <LeafletTooltip permanent direction="center" className="grid-label">
                {g.rank === null ? "20+" : String(g.rank)}
              </LeafletTooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
```

- [ ] **Step 2: Add Leaflet tooltip label styling to app/globals.css**

```css
.grid-label { background: transparent !important; border: none !important; box-shadow: none !important; color: #fff; font-weight: 700; }
.grid-label::before { display: none !important; }
.leaflet-container { background: #0f1626; }
```

- [ ] **Step 3: Verify type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/GeoGridMap.tsx app/globals.css
git commit -m "feat: add geo-grid heatmap with Leaflet"
```

### Task 17: CompetitorList, LocalRankTable, MapPack container

**Files:**
- Create: `components/CompetitorList.tsx`, `components/LocalRankTable.tsx`, `components/MapPack.tsx`

`MapPack` is a client component that owns the selected-keyword state and lazy-loads `GeoGridMap` (Leaflet) with `next/dynamic` to keep it off the server.

- [ ] **Step 1: Implement components/CompetitorList.tsx**

```tsx
import { Card } from "@/components/ui/Card";
import { Star } from "lucide-react";
import type { Competitor } from "@/lib/types";

export function CompetitorList({ competitors }: { competitors: Competitor[] }) {
  return (
    <Card>
      <h3 className="mb-3 text-sm font-semibold text-slate-300">Who is in the pack</h3>
      <ul className="space-y-2">
        {competitors.length === 0 && <li className="text-sm text-slate-500">No competitor data.</li>}
        {competitors.map((c) => (
          <li key={c.title} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <span className="w-5 text-slate-500">{c.rank}</span>
              <span>{c.title}</span>
            </span>
            <span className="flex items-center gap-1 text-slate-400">
              <Star className="h-3 w-3 text-yellow-500" />
              {c.rating ?? "n/a"} ({c.reviews ?? 0})
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
```

- [ ] **Step 2: Implement components/LocalRankTable.tsx**

```tsx
import { Card } from "@/components/ui/Card";
import { Delta } from "@/components/ui/Delta";
import type { MapTrackerRow } from "@/lib/types";

export function LocalRankTable({ rows }: { rows: MapTrackerRow[] }) {
  return (
    <Card>
      <h3 className="mb-3 text-sm font-semibold text-slate-300">Local rank tracker</h3>
      <table className="w-full text-sm">
        <thead className="text-left text-slate-500">
          <tr><th className="py-1">Keyword</th><th>Avg</th><th>Now</th><th>Prev</th><th>Delta</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.keyword} className="border-t border-surface-border">
              <td className="py-2">{r.keyword}</td>
              <td>{r.avgRank?.toFixed(1) ?? "n/a"}</td>
              <td>{r.current ?? "20+"}</td>
              <td>{r.previous ?? "n/a"}</td>
              <td>{r.delta === null ? "n/a" : <Delta pct={r.delta} lowerIsBetter={false} />}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
```

Note: `delta` here is rank positions (positive = improved), so `lowerIsBetter={false}` makes positive green, which is correct.

- [ ] **Step 3: Implement components/MapPack.tsx**

```tsx
"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import { Card } from "@/components/ui/Card";
import { CompetitorList } from "@/components/CompetitorList";
import { LocalRankTable } from "@/components/LocalRankTable";
import type { KeywordMapResult, MapTrackerRow } from "@/lib/types";
import { GRID } from "@/config/grid";

const GeoGridMap = dynamic(() => import("@/components/GeoGridMap").then((m) => m.GeoGridMap), { ssr: false });

export function MapPack({
  keywords, tracker, available,
}: { keywords: KeywordMapResult[]; tracker: MapTrackerRow[]; available: boolean }) {
  const [selected, setSelected] = useState(0);
  if (!available || keywords.length === 0) {
    return <Card><p className="text-slate-400">Map pack data is not available yet. It populates after the first nightly scan.</p></Card>;
  }
  const k = keywords[selected];
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Google Map Pack</h2>
        <select
          value={selected}
          onChange={(e) => setSelected(Number(e.target.value))}
          className="rounded-md border border-surface-border bg-surface-card px-3 py-1 text-sm"
        >
          {keywords.map((kw, i) => <option key={kw.keyword} value={i}>{kw.keyword}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-2">
          <div className="flex gap-6 text-sm text-slate-300">
            <span>Avg map rank: <b>{k.avgRank?.toFixed(1) ?? "n/a"}</b></span>
            <span>In top 3: <b>{Math.round(k.pctTop3 * 100)}%</b></span>
          </div>
          <GeoGridMap grid={k.grid} center={[GRID.centerLat, GRID.centerLng]} />
        </div>
        <CompetitorList competitors={k.competitors} />
      </div>
      <LocalRankTable rows={tracker} />
    </section>
  );
}
```

- [ ] **Step 4: Verify type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add components/CompetitorList.tsx components/LocalRankTable.tsx components/MapPack.tsx
git commit -m "feat: add map pack container, competitor list, local rank table"
```

### Task 18: DecliningPanel, QueriesTable, PagesTable

**Files:**
- Create: `components/DecliningPanel.tsx`, `components/QueriesTable.tsx`, `components/PagesTable.tsx`

- [ ] **Step 1: Implement components/DecliningPanel.tsx**

```tsx
import { Card } from "@/components/ui/Card";
import { TrendingDown } from "lucide-react";
import type { DeclineRow } from "@/lib/types";

export function DecliningPanel({ rows }: { rows: DeclineRow[] }) {
  return (
    <Card>
      <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
        <TrendingDown className="h-4 w-4 text-bad" /> Declining rankings
      </h2>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-500">No pages dropped past the threshold this period.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {rows.slice(0, 10).map((r) => (
            <li key={r.key} className="flex items-center justify-between border-t border-surface-border pt-2">
              <span className="truncate pr-3 text-slate-300">{r.key}</span>
              <span className="text-bad">
                {r.priorPosition.toFixed(1)} to {r.recentPosition.toFixed(1)} (+{r.delta.toFixed(1)})
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
```

- [ ] **Step 2: Implement components/QueriesTable.tsx**

```tsx
import { Card } from "@/components/ui/Card";
import type { QueryRow } from "@/lib/types";

export function QueriesTable({ rows }: { rows: QueryRow[] }) {
  return (
    <Card>
      <h2 className="mb-3 text-lg font-semibold">Top 20 queries</h2>
      <table className="w-full text-sm">
        <thead className="text-left text-slate-500">
          <tr><th className="py-1">Query</th><th>Clicks</th><th>Impr</th><th>CTR</th><th>Pos</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.query} className="border-t border-surface-border">
              <td className="py-2 pr-3">{r.query}</td>
              <td>{r.clicks}</td>
              <td>{r.impressions}</td>
              <td>{(r.ctr * 100).toFixed(1)}%</td>
              <td>{r.position.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
```

- [ ] **Step 3: Implement components/PagesTable.tsx**

```tsx
import { Card } from "@/components/ui/Card";
import type { PageRow } from "@/lib/types";

function shortPath(url: string) {
  try { return new URL(url).pathname || "/"; } catch { return url; }
}

export function PagesTable({ rows }: { rows: PageRow[] }) {
  return (
    <Card>
      <h2 className="mb-3 text-lg font-semibold">Top 10 pages</h2>
      <table className="w-full text-sm">
        <thead className="text-left text-slate-500">
          <tr><th className="py-1">Page</th><th>Clicks</th><th>Impr</th><th>CTR</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.page} className="border-t border-surface-border">
              <td className="py-2 pr-3 text-accent">{shortPath(r.page)}</td>
              <td>{r.clicks}</td>
              <td>{r.impressions}</td>
              <td>{(r.ctr * 100).toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
```

- [ ] **Step 4: Verify type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add components/DecliningPanel.tsx components/QueriesTable.tsx components/PagesTable.tsx
git commit -m "feat: add declines panel, queries and pages tables"
```

### Task 19: Header with date range and theme toggle

**Files:**
- Create: `components/Header.tsx`, `components/DateRangePicker.tsx`, `components/ThemeToggle.tsx`

The date range is a client control that sets a `?range=30|60|90` query param; the page reads it server-side. Theme toggle flips the `dark` class on `<html>`.

- [ ] **Step 1: Implement components/ThemeToggle.tsx**

```tsx
"use client";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const [dark, setDark] = useState(true);
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", dark);
    root.classList.toggle("light", !dark);
  }, [dark]);
  return (
    <button onClick={() => setDark((d) => !d)} className="rounded-md border border-surface-border p-2" aria-label="Toggle theme">
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
```

- [ ] **Step 2: Implement components/DateRangePicker.tsx**

```tsx
"use client";
import { useRouter, useSearchParams } from "next/navigation";

const RANGES = [30, 60, 90];

export function DateRangePicker() {
  const router = useRouter();
  const params = useSearchParams();
  const current = Number(params.get("range") ?? 30);
  return (
    <div className="flex gap-1">
      {RANGES.map((r) => (
        <button
          key={r}
          onClick={() => router.push(`/?range=${r}`)}
          className={`rounded-md px-3 py-1 text-sm ${current === r ? "bg-accent text-white" : "border border-surface-border text-slate-400"}`}
        >
          {r}d
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Implement components/Header.tsx**

```tsx
import { Suspense } from "react";
import { DateRangePicker } from "@/components/DateRangePicker";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SITE } from "@/config/site";

export function Header({ generatedAt }: { generatedAt: string }) {
  const updated = new Date(generatedAt).toLocaleString("en-US", { timeZone: "America/Chicago" });
  return (
    <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold">BH Roofing SEO Dashboard</h1>
        <p className="text-sm text-slate-400">{SITE.domain} · Updated {updated} CT</p>
      </div>
      <div className="flex items-center gap-3">
        <Suspense fallback={null}><DateRangePicker /></Suspense>
        <ThemeToggle />
      </div>
    </header>
  );
}
```

- [ ] **Step 4: Verify type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add components/Header.tsx components/DateRangePicker.tsx components/ThemeToggle.tsx
git commit -m "feat: add header, date range picker, theme toggle"
```

---

## Phase 9: Page assembly, deploy config, verification

### Task 20: Assemble the dashboard page

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Replace app/page.tsx**

```tsx
import { getDashboardData } from "@/lib/data";
import { Header } from "@/components/Header";
import { MetricCards } from "@/components/MetricCards";
import { MapPack } from "@/components/MapPack";
import { TrendChart } from "@/components/TrendChart";
import { DecliningPanel } from "@/components/DecliningPanel";
import { QueriesTable } from "@/components/QueriesTable";
import { PagesTable } from "@/components/PagesTable";

export const revalidate = 43200; // 12h ISR

export default async function Page({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const { range } = await searchParams;
  const trendDays = [30, 60, 90].includes(Number(range)) ? Number(range) : 30;
  const todayIso = new Date().toISOString().slice(0, 10);
  const data = await getDashboardData(todayIso, trendDays);

  return (
    <main className="mx-auto max-w-7xl p-4 sm:p-6">
      <Header generatedAt={data.generatedAt} />
      <div className="space-y-6">
        <MetricCards summary={data.summary} timeseries={data.timeseries} />
        <MapPack keywords={data.map.keywords} tracker={data.map.tracker} available={data.map.available} />
        <TrendChart data={data.timeseries} />
        <DecliningPanel rows={data.declines} />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <QueriesTable rows={data.topQueries} />
          <PagesTable rows={data.topPages} />
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: build succeeds. Page `/` builds; it will error at request time only if env vars are missing, which is expected locally without credentials.

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat: assemble dashboard page"
```

### Task 21: Deploy config and env example

**Files:**
- Create: `vercel.json`, `.env.example`

- [ ] **Step 1: Create vercel.json (nightly cron at 08:00 UTC = ~2-3am CT)**

```json
{
  "crons": [{ "path": "/api/refresh", "schedule": "0 8 * * *" }]
}
```

Note: Vercel Cron sends the request with `Authorization: Bearer <CRON_SECRET>` automatically when `CRON_SECRET` is set as an env var, which the route checks.

- [ ] **Step 2: Create .env.example**

```bash
# Google Search Console service account (entire JSON on one line)
GSC_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"...@...iam.gserviceaccount.com"}
# GSC property (domain property shown; use https://bhroofingsa.com/ for a URL-prefix property)
GSC_SITE_URL=sc-domain:bhroofingsa.com

# DataForSEO API (from app.dataforseo.com -> API Access; password is API password, not login password)
DATAFORSEO_LOGIN=
DATAFORSEO_PASSWORD=

# BH Roofing Google Maps place_id (most reliable rank match; see README for how to find it)
BH_PLACE_ID=

# Protects /api/refresh; Vercel Cron sends it automatically as a Bearer token
CRON_SECRET=

# Vercel Blob (auto-injected when a Blob store is linked to the project)
BLOB_READ_WRITE_TOKEN=
```

- [ ] **Step 3: Commit**

```bash
git add vercel.json .env.example
git commit -m "chore: add Vercel cron config and env example"
```

### Task 22: README with full setup and the place_id discovery step

**Files:**
- Create: `README.md`

- [ ] **Step 1: Create README.md**

````markdown
# BH Roofing SEO Dashboard

Live, public SEO dashboard for bhroofingsa.com. Google Search Console organic
performance plus a Google Map Pack geo-grid heatmap (DataForSEO). Next.js on Vercel.

## Local development

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill every value (see Setup below).
3. `npm run dev` and open http://localhost:3000
4. To populate map data locally, hit the refresh route once:
   `curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/refresh`

## Tests

`npm test` runs the Vitest suite covering the data libraries.

## Setup (one-time)

### 1. Google Search Console service account
1. In Google Cloud Console, create a project, enable the **Search Console API**.
2. Create a **service account**, add a **JSON key**, download it.
3. In Search Console, open the bhroofingsa.com property → Settings → Users and
   permissions → add the service account `client_email` as a **Full** or
   **Restricted** user.
4. Put the entire JSON (one line) in `GSC_SERVICE_ACCOUNT_JSON`. Set `GSC_SITE_URL`
   to `sc-domain:bhroofingsa.com` (domain property) or `https://bhroofingsa.com/`
   (URL-prefix property).

### 2. DataForSEO
1. Create an account at dataforseo.com.
2. From app.dataforseo.com → API Access, copy the login and **API password**.
3. Set `DATAFORSEO_LOGIN` and `DATAFORSEO_PASSWORD`.

### 3. BH Roofing place_id (for accurate map-pack matching)
Run one live Maps query and read the `place_id` of the BH Roofing entry:
```bash
cred=$(printf "%s:%s" "$DATAFORSEO_LOGIN" "$DATAFORSEO_PASSWORD" | base64)
curl -s -X POST https://api.dataforseo.com/v3/serp/google/maps/live/advanced \
  -H "Authorization: Basic $cred" -H "Content-Type: application/json" \
  -d '[{"keyword":"bh roofing san antonio","location_coordinate":"29.5916,-98.4366,13z","language_code":"en","device":"desktop"}]' \
  | grep -o '"place_id":"[^"]*"' | head
```
Set the BH Roofing value in `BH_PLACE_ID`. If left blank, the app falls back to
matching by the name "bh roofing".

### 4. Vercel
1. Push this repo to GitHub, import it in the Vercel dashboard.
2. Add all env vars from `.env.example` in Project Settings → Environment Variables.
3. Create a **Blob store** (Storage tab) and link it; this injects
   `BLOB_READ_WRITE_TOKEN` automatically.
4. The nightly cron (`vercel.json`) calls `/api/refresh` at 08:00 UTC. Vercel sends
   `CRON_SECRET` automatically. Trigger it once manually after first deploy to seed data.

## Cost

DataForSEO Maps live ≈ $0.002 per grid point. Default config: 25 points × 6 keywords
nightly ≈ $0.30/night ≈ $9/month. Tune `config/grid.ts` (`size`, `radiusMiles`) and
`config/keywords.ts` (`GRID_KEYWORD_COUNT`).

## Configuration

- `config/keywords.ts` — target keyword list (edit freely).
- `config/grid.ts` — grid center, radius, size, zoom.
- `config/site.ts` — domain, GSC property, place_id, data lag.
````

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add README with setup, place_id discovery, cost notes"
```

### Task 23: Full test + build verification

- [ ] **Step 1: Run the whole test suite**

Run: `npm test`
Expected: all suites pass — `dates`, `gsc`, `dataforseo`, `grid`, `snapshots`, `delta` (≈ 30 tests).

- [ ] **Step 2: Type-check and production build**

Run: `npx tsc --noEmit && npm run build`
Expected: no type errors; build completes. The home route may show as dynamic/ISR; `/api/refresh` as a dynamic function.

- [ ] **Step 3: Manual smoke test with real credentials (local)**

With `.env.local` filled:
Run: `npm run dev`, then `curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/refresh`
Expected: JSON `{ ok: true, keywords: 6, capturedAt: ... }`; then loading http://localhost:3000 shows metric cards (GSC) and the map pack heatmap populated.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "test: verify full suite and production build"
```

---

## Self-Review (completed during authoring)

**Spec coverage:**
- Performance summary clicks/impressions/CTR/position, 28d vs prev with % change → Task 3 (`summaryWithDelta`), Task 14 (MetricCards).
- Top 20 queries → Task 3 (`toQueryRows`), Task 18 (QueriesTable).
- Top 10 pages → Task 3 (`toPageRows`), Task 18 (PagesTable).
- Keyword rank tracker current/previous/delta → Task 9 (`buildTracker`), Task 17 (LocalRankTable).
- Rankings over time 30/60/90 → Task 15 (TrendChart, GSC) + Task 9 (`buildTrends`, map). GSC trend is wired into the page; map `trends` are computed and available in `DashboardData.map.trends` for a future trend view (not rendered in v1 to keep the page focused — noted, not a gap).
- Declining rankings auto-flagged → Task 4 (`detectDeclines`), Task 18 (DecliningPanel).
- Filter by date range → Task 19 (DateRangePicker) + Task 20 (page reads `range`).
- Map pack geo-grid + competitors → Tasks 6, 7, 8, 16, 17.
- Dark/light, mobile responsive → Tasks 0, 13, 19 (Tailwind grid + ThemeToggle).
- No login, Vercel free tier, env vars for credentials → Tasks 0, 21, 22.
- Caching + nightly precompute → Task 11 (`unstable_cache`), Task 12 (refresh route), Task 21 (cron).
- No hyphens/em-dashes as separators in UI copy → honored in all component strings.

**Placeholder scan:** No TBD/TODO; every code step contains complete code.

**Type consistency:** `GridResult`, `KeywordMapResult`, `MapSnapshot`, `MapTrackerRow`, `MatchConfig`, `MetricSummary`, `SummaryWithDelta` used consistently across Tasks 1, 7, 8, 9, 11, 12, 17. `centerRank` uses fixed row/col 2 matching the 5×5 grid center from `generateGrid` (size 5 → indices 0..4, center 2). `findRank` returns `rank_group`; consumed as `rank` throughout.

**Known v1 scope note:** map rank-over-time is computed and stored but not charted in v1 (GSC trend chart covers the "rankings over time" requirement for organic; map trend is a small v2 addition). Flagged for Lou.
