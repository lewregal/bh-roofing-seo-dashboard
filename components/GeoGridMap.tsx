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
