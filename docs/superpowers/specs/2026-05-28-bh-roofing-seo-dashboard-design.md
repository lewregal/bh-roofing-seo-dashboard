# BH Roofing Live SEO Dashboard — Design Spec

**Date:** 2026-05-28
**Client:** BH Roofing (San Antonio)
**Target domain:** bhroofingsa.com
**Status:** Approved design, pending implementation plan

## 1. Purpose

A live, client-facing SEO reporting dashboard for BH Roofing. It surfaces organic
search performance from Google Search Console and, as the headline feature, Google
Map Pack (local pack) rankings from DataForSEO, visualized as a geo-grid heatmap
across the San Antonio service area. Public URL, no login, single domain. Deployed
on Vercel free tier.

The visual reference is the client's current tool (ClickRank): dark UI, metric cards
with sparklines and current-vs-previous deltas, a multi-line performance trend chart.
This dashboard mirrors that feel, recolored to BH brand, and adds the map-pack focus
ClickRank lacks.

## 2. Goals & non-goals

### Goals
- One-page dashboard, dark mode by default, light toggle available.
- Mobile responsive.
- Map Pack is the centerpiece: geo-grid heatmap + competitor visibility + local rank table.
- Organic performance summary, trends, top queries, top pages from GSC.
- Auto-flag declining rankings (organic and map pack).
- Date-range filter.
- All API credentials externalized to environment variables.
- Cost-controlled: nightly precompute + caching so public visits do not re-hit paid APIs.

### Non-goals (v1)
- No login / auth / multi-tenant.
- No website health / technical SEO audit panel (deferred to v2; would use DataForSEO On-Page API).
- No relational database. State is limited to dated JSON snapshots in Vercel Blob (map pack only).
- No GA4 integration.

## 3. Stack

- **Next.js (App Router) + TypeScript**
- **Tailwind CSS** for styling
- **Recharts** for sparklines and the multi-line trend chart
- **react-leaflet + OpenStreetMap tiles** for the geo-grid heatmap (free, no API key)
- **lucide-react** for icons
- **Vercel** hosting (free tier), **Vercel Cron** for nightly refresh, **Vercel Blob** for snapshots
- Local toolchain confirmed: Node v24.13.0, npm 11.6.2 (Vercel CLI not yet installed)

## 4. Data sources

### 4.1 Google Search Console (organic backbone)
- **Auth:** Google service account. A JSON key is stored in `GSC_SERVICE_ACCOUNT_JSON`.
  The service account email is added as a user on the `bhroofingsa.com` GSC property.
  Chosen over OAuth because a no-login server app benefits from credentials that do
  not expire and need no consent refresh.
- **Powers:**
  - Top metric cards: clicks, impressions, CTR, avg position. Current 28 days vs
    previous 28 days, with % change. (Fixed window, matching ClickRank.)
  - Performance trend chart: clicks / impressions / CTR / avg position over time,
    30 / 60 / 90 day toggle.
  - Top 20 queries by clicks (with position, impressions, CTR).
  - Top 10 pages by clicks.
  - Organic declining-rankings flag: compare each query/page avg position in a recent
    window vs the prior window; flag drops past a threshold (default: position worsened
    by >= 3).
- **Notes:** GSC has ~2-3 day data latency and 16-month retention, so 90-day trends
  are fine.

### 4.2 DataForSEO Google Maps SERP API (map pack)
- **Auth:** REST Basic auth via `DATAFORSEO_LOGIN` / `DATAFORSEO_PASSWORD`.
- **Endpoint:** Google Maps SERP live advanced, queried per keyword per geographic
  grid point (location_coordinate = lat,lng,zoom).
- **Powers:**
  - Geo-grid heatmap: BH Roofing's local-pack rank at each grid point per keyword.
  - Average map rank and % of grid in top 3.
  - Competitors in the pack: businesses ranking in the local 3-pack for the selected
    keyword/area, with rating and review count.
  - Local rank table: each target keyword with avg map rank, current, previous, delta.
- **Grid default:** 5x5 = 25 points across the San Antonio service area, for the top
  ~6 keywords, run nightly. Configurable (center lat/lng, radius, grid size). Rough
  DataForSEO cost estimate $7-10/mo; expandable later.

### 4.3 Target keyword list
- Auto-seeded from BH Roofing's top GSC queries on first run, written to an editable
  config file (`config/keywords.ts` or similar) so the list stays stable and Lou can
  hand-edit it. The map-pack grid runs against the top ~6 of these.

## 5. State & storage

The organic/GSC side is fully stateless: GSC is itself historical, so trends and
deltas are derived from live GSC reads (cached).

The Google Maps API is point-in-time only with no historical endpoint. To compute
previous-rank deltas and map-rank-over-time, the nightly cron writes a timestamped
JSON snapshot of the full map-pack result set to **Vercel Blob**. The dashboard reads
recent snapshots to compute deltas and trend. This is the only persisted state; it is
dated JSON files, not a relational database.

Snapshot shape (per nightly run): timestamp, per keyword -> per grid point -> BH rank
+ top-3 competitor list. Retention: keep ~100 days of snapshots, prune older.

## 6. Caching & cost control

- Server-side data fetches wrapped in Next.js ISR caching (revalidate ~12h) so
  repeated public visits do not re-hit GSC or DataForSEO.
- **Vercel Cron** runs nightly: refreshes GSC reads, runs the DataForSEO Maps grid,
  writes the Blob snapshot, and warms the cache.
- The refresh/cron route is protected by `CRON_SECRET` so it cannot be triggered by
  arbitrary visitors.
- Public URL, no login.

## 7. Layout (single page, top to bottom)

1. **Header** — BH Roofing name + bhroofingsa.com, "Last updated" timestamp,
   date-range picker, light/dark toggle.
2. **Top metric cards (4)** — Total Clicks, Total Impressions, Avg CTR, Avg Position.
   Each: current value, previous-period value, % change (color-coded), sparkline.
3. **Map Pack section (headline):**
   - Geo-grid heatmap over San Antonio (Leaflet + OSM). Keyword selector. Grid points
     colored by local-pack rank: green = top 3, amber = 4-10, red = not ranking.
     Shows Average Map Rank and % of grid in top 3.
   - Competitors in the pack for the selected keyword/area (name, rank, rating, reviews).
   - Local rank table: keyword, avg map rank, current, previous, delta.
4. **Performance Trends chart** — multi-line with Clicks / Impressions / CTR / Avg
   Position toggles, 30 / 60 / 90 day selector.
5. **Declining rankings panel** — auto-flagged organic pages/queries dropping in GSC
   position, plus keywords slipping in the map pack.
6. **Top 20 queries / Top 10 pages** — side by side on desktop, stacked on mobile.

### Date-range behavior
The top metric cards use a fixed 28d vs previous 28d window (matching ClickRank). The
trend chart and the queries/pages tables respond to the global date-range selector
(30 / 60 / 90 / custom).

## 8. Design language

- Dark default: deep navy/charcoal surfaces, `#0B2545` brand accent, subtle card
  borders, soft elevation. Light mode is a toggle.
- Deltas color-coded: green for improvement, red for decline. (For Avg Position and
  map rank, lower is better, so the color logic is inverted vs clicks/impressions.)
- Sparklines on metric cards.
- No hyphens or em-dashes as stylistic separators anywhere in UI copy (BH absolute rule).

## 9. Component boundaries

- `lib/gsc.ts` — service-account auth + Search Console queries (summary, timeseries,
  top queries, top pages, decline detection). Pure data, no UI.
- `lib/dataforseo.ts` — Google Maps SERP client; per-keyword-per-point fetch; parse BH
  rank + competitors. Pure data, no UI.
- `lib/grid.ts` — generate the geo-grid coordinates from center/radius/size config.
- `lib/snapshots.ts` — read/write/prune Vercel Blob snapshots; compute deltas + trend.
- `lib/cache.ts` — ISR/caching wrappers.
- `config/keywords.ts`, `config/grid.ts` — editable config.
- `app/api/refresh/route.ts` — cron-triggered refresh, guarded by `CRON_SECRET`.
- `app/page.tsx` + `components/*` — dashboard UI (MetricCards, MapPack/GeoGridMap,
  CompetitorList, LocalRankTable, TrendChart, DecliningPanel, QueriesTable, PagesTable,
  Header/DateRange/ThemeToggle).

Each lib unit takes config/credentials in and returns plain typed data; UI components
take data in as props. This keeps data fetching testable independent of rendering.

## 10. Error handling

- Each data source fails independently: if DataForSEO is down, the GSC sections still
  render, and the map-pack section shows a clear "data unavailable" state (and falls
  back to the last good Blob snapshot where possible).
- Missing/invalid env vars produce a clear server-side error, not a blank page.
- API rate-limit / partial-failure on the grid: render the points that succeeded and
  mark the rest as unknown rather than failing the whole grid.
- "Last updated" reflects the snapshot/cache time so stale data is visible, not hidden.

## 11. Testing

- Unit-test the pure lib functions with mocked API responses: GSC summary/delta math,
  decline detection threshold, grid coordinate generation, snapshot delta/trend
  computation, map-rank color bucketing.
- Light component tests for delta color logic (especially the inverted position/rank
  case) and empty/error states.
- Manual verification against live GSC + DataForSEO before sharing with the client.

## 12. Environment variables

| Var | Purpose |
|-----|---------|
| `GSC_SERVICE_ACCOUNT_JSON` | Google service account key (JSON) |
| `GSC_SITE_URL` | GSC property, e.g. `sc-domain:bhroofingsa.com` |
| `DATAFORSEO_LOGIN` | DataForSEO Basic auth user |
| `DATAFORSEO_PASSWORD` | DataForSEO Basic auth password |
| `CRON_SECRET` | Guards the refresh/cron route |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob access for snapshots |
| Map grid config | center lat/lng, radius, grid size, language/country (can live in config file with env overrides) |

## 13. Deploy

Built deploy-ready for Vercel. Final deploy needs Lou's Vercel login. Recommended path:
push to a GitHub repo and connect it in the Vercel dashboard, which handles Cron, Blob,
and env-var management. Alternative: install Vercel CLI and `vercel deploy`. This step
is flagged for Lou because it requires his account and the GSC property sharing +
service account creation in Google Cloud.

## 14. Open setup tasks for Lou (outside the code build)

1. Create a Google Cloud service account, enable the Search Console API, download the
   JSON key.
2. Add the service account email as a user on the `bhroofingsa.com` Search Console
   property.
3. Confirm DataForSEO account credentials.
4. Create a Vercel account / project and a Blob store.
