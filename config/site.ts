export const SITE = {
  domain: "bhroofingsa.com",
  // GSC domain property. Override with env if a URL-prefix property is used instead.
  gscSiteUrl: process.env.GSC_SITE_URL ?? "sc-domain:bhroofingsa.com",
  businessName: "BH Roofing",
  // Match keys for identifying BH Roofing in DataForSEO maps results.
  // place_id is most reliable; verified live 2026-05-28 (public Google data).
  placeId: process.env.BH_PLACE_ID ?? "ChIJy8kknSyLXIYRss9BTyWD_Ms",
  nameMatch: "bh roofing",
  // GSC data lag in days (data is ~2-3 days behind).
  dataLagDays: 3,
} as const;
