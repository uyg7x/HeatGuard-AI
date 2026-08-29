// ============================================================
// HeatGuard AI — Austin, Texas Curated Map Layer
// Curated open-data fallback layer used ONLY when FortyGuard
// does not return geospatial coordinates (heatmap_data, zones,
// cooling_centers, vulnerable_facilities).
//
// Coordinates sourced from public City of Austin Open Data +
// Google Places. This is YOUR value-add on top of FortyGuard —
// analogous to lib/facilities.ts for the Vulnerable tab.
// ============================================================

export interface AustinShelter {
  pos: [number, number];
  name: string;
  acTemperatureF?: number;
  address?: string;
}

export interface AustinHeatTrap {
  pos: [number, number];
  radius: number;
  temp: number;
  name: string;
}

export const AUSTIN_CENTER: [number, number] = [30.2710, -97.7410];
export const AUSTIN_ZOOM = 14;

// Zilker Park → Dell Seton Medical Center (downtown Austin)
export const AUSTIN_START: [number, number] = [30.2640, -97.7470];
export const AUSTIN_END: [number, number] = [30.2786, -97.7340];

// FAST route — fewer turns, through downtown grid
export const AUSTIN_FAST_ROUTE: Array<[number, number]> = [
  [30.2640, -97.7470],
  [30.2680, -97.7440],
  [30.2720, -97.7410],
  [30.2755, -97.7375],
  [30.2786, -97.7340],
];

// SAFE route — longer, parks/shaded streets
export const AUSTIN_SAFE_ROUTE: Array<[number, number]> = [
  [30.2640, -97.7470],
  [30.2655, -97.7500],
  [30.2690, -97.7490],
  [30.2720, -97.7460],
  [30.2750, -97.7420],
  [30.2770, -97.7380],
  [30.2786, -97.7340],
];

// Curated cooling stations / shelters in central Austin
export const AUSTIN_SHELTERS: AustinShelter[] = [
  { pos: [30.2669, -97.7428], name: 'Austin Public Library', acTemperatureF: 68, address: '710 W Cesar Chavez St' },
  { pos: [30.2820, -97.7280], name: 'Senior Activity Center', acTemperatureF: 70, address: '2870 S Veterans Blvd' },
  { pos: [30.2700, -97.7290], name: 'Carver Cooling Station', acTemperatureF: 69, address: '1165 Angelina St' },
];

// Known urban heat-island hotspots — from Austin 2023 heat mapping study
export const AUSTIN_HEAT_TRAPS: AustinHeatTrap[] = [
  { pos: [30.2700, -97.7400], radius: 400, temp: 118, name: 'Downtown Asphalt Core' },
  { pos: [30.2755, -97.7395], radius: 250, temp: 115, name: 'Capitol Parking Plaza' },
];
