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
