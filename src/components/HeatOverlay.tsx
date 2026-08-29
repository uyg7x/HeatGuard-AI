// ============================================================
// HeatGuard AI — HeatOverlay
// Live heat cells fetched from /api/heatmap?city=<id> and drawn
// on top of the Leaflet basemap as crisp pixel rectangles
// (matches the official FortyGuard dashboard's 100m×100m raster).
// No mock data — only renders what the API actually returned.
//
// Falls back to a graceful "no live cells" badge so users see
// the real API state instead of fake heat.
// ============================================================

'use client';

import React, { useEffect, useState } from 'react';
import { Popup, Rectangle, useMap } from 'react-leaflet';
import { AlertCircle } from 'lucide-react';

interface HeatCell {
  lat: number;
  lng: number;
  temperature: number;
  radius?: number;
}

interface HeatOverlayProps {
  cityId: string;
}

function colorForTemperature(t: number): string {
  if (t >= 110) return '#7F1D1D'; // extreme — deep red
  if (t >= 100) return '#EF4444'; // high — red
  if (t >= 90) return '#F97316';  // moderate-high — orange
  if (t >= 80) return '#F59E0B';  // warm — amber
  return '#10B981';               // safe — green
}

/**
 * Derive a cell's footprint in lat/lng from its radius (in meters).
 * At 30°N, 1° lat ≈ 111 km, 1° lng ≈ 96 km. We use a small-cell default
 * (90 m radius → ~0.0008° box) so adjacent cells visually tile.
 */
function cellBounds(lat: number, lng: number, radiusMeters: number): [[number, number], [number, number]] {
  const dLat = radiusMeters / 111_000;
  const dLng = radiusMeters / (111_000 * Math.cos((lat * Math.PI) / 180));
  return [
    [lat - dLat, lng - dLng],
    [lat + dLat, lng + dLng],
  ];
}

const HeatOverlay: React.FC<HeatOverlayProps> = ({ cityId }) => {
  const map = useMap();
  const [cells, setCells] = useState<HeatCell[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [shape, setShape] = useState<string | null>(null);
  const [cityName, setCityName] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchHeatmap = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/heatmap?city=${encodeURIComponent(cityId)}`, { method: 'POST' });
        const payload = await res.json();
        if (cancelled) return;
        if (!res.ok || !payload.success) {
          setError(payload.error || `Heatmap request failed (${res.status})`);
          setCells([]);
        } else {
          setCells(Array.isArray(payload.cells) ? payload.cells : []);
          setSource(typeof payload.source === 'string' ? payload.source : null);
          setShape(typeof payload.shape === 'string' ? payload.shape : null);
          setCityName(typeof payload.cityName === 'string' ? payload.cityName : null);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || 'Failed to fetch heatmap');
          setCells([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchHeatmap();
    return () => { cancelled = true; };
  }, [cityId]);

  if (loading && cells.length === 0) return null;
  if (error && cells.length === 0) {
    return (
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[500] bg-white border border-amber-300 text-amber-700 !py-2 !px-4 rounded-xl text-xs flex items-center gap-2 shadow-md pointer-events-none">
        <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
        <span>Live heatmap unavailable for {cityName ?? cityId}: {error}</span>
      </div>
    );
  }

  if (cells.length === 0) return null;

  return (
    <>
      {cells.map((cell, idx) => {
        // FortyGuard's hyperlocal grid is ~100m per cell. 90m radius gives a
        // crisp tiled raster instead of overlapping blurry circles.
        const radius = typeof cell.radius === 'number' ? Math.min(cell.radius, 90) : 90;
        const color = colorForTemperature(cell.temperature);
        const bounds = cellBounds(cell.lat, cell.lng, radius);
        return (
          <Rectangle
            key={`heat-cell-${idx}-${cell.lat.toFixed(5)}-${cell.lng.toFixed(5)}`}
            bounds={bounds}
            pathOptions={{
              color,
              weight: 0,
              fillColor: color,
              fillOpacity: 0.75,
              className: 'pixel-cells',
            }}
          >
            <Popup>
              <div className="text-xs space-y-1">
                <div className="font-semibold text-orange-600">Heat Cell</div>
                <div>Temp: <span className="font-bold">{cell.temperature.toFixed(1)}°F</span></div>
                <div>Lat/Lng: {cell.lat.toFixed(4)}, {cell.lng.toFixed(4)}</div>
                {source && <div className="text-slate-500">Source: {source}</div>}
                {shape && <div className="text-slate-500">Shape: {shape}</div>}
              </div>
            </Popup>
          </Rectangle>
        );
      })}
    </>
  );
};

export default HeatOverlay;
