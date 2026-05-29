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
