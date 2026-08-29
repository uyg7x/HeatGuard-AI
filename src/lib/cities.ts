// ============================================================
// HeatGuard AI — City Registry
// Single source of truth for all multi-city coordinates,
// map zoom levels, and AOI bounding boxes used across:
//   - /api/fortyguard (?city=)
//   - /api/history (?city=)
//   - /api/heatmap (uses cityPolygon)
//   - MapView (center/zoom + HeatOverlay)
//   - CitySelector (UI switcher)
// ============================================================

export interface CityConfig {
  id: string;
  name: string;
  lat: number;
  lon: number;
  zoom: number;
}

export const CITIES: CityConfig[] = [
  { id: 'san-antonio', name: 'San Antonio', lat: 29.4241, lon: -98.4936, zoom: 12 },
  { id: 'fort-worth', name: 'Fort Worth', lat: 32.7555, lon: -97.3308, zoom: 12 },
  { id: 'dallas', name: 'Dallas', lat: 32.7767, lon: -96.7970, zoom: 12 },
  { id: 'concho', name: 'Concho County', lat: 31.3946, lon: -99.9270, zoom: 10 },
];

export function getCity(id: string): CityConfig {
  return CITIES.find((c) => c.id === id) || CITIES[2]; // default: Dallas
}

// Bounding-box polygon around a city (for the heatmap AOI).
// Returns a [lng, lat] ring closed by repeating the first vertex,
// suitable for GeoJSON Polygon.coordinates[0].
export function cityPolygon(lat: number, lon: number, s = 0.15): Array<[number, number]> {
  return [
    [lon - s, lat - s],
    [lon + s, lat - s],
    [lon + s, lat + s],
    [lon - s, lat + s],
    [lon - s, lat - s],
  ];
}
