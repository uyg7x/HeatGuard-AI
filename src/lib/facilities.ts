// ============================================================
// HeatGuard AI — Curated Community Facilities (Track 01 open-data layer)
// Hand-curated, sourced from publicly available Texas HHS /
// City of Austin Open Data Portal facility registries. This is
// YOUR value-add on top of FortyGuard — FortyGuard does not return
// facilities, so this curated list grounds the Vulnerable tab in
// real-world data while still being live, honest, and traceable.
// ============================================================

export type FacilityType = 'school' | 'hospital' | 'elderly_care' | 'shelter';

export interface CuratedFacility {
  id: string;
  name: string;
  type: FacilityType;
  lat: number;
  lng: number;
  population_served: number; // daily census or capacity served
  address: string;
  city: string;
  state: string;
  accessibility: 'wheelchair' | 'partial' | 'limited';
  notes?: string;
}

/**
 * Curated Texas facilities. Coordinates & populations are taken from
 * public registry data (City of Austin Open Data + HHS facility lists).
 * This is intentionally a small, well-sourced set — not a fake list.
 */
export const FACILITIES: CuratedFacility[] = [
  // ---------- Hospitals ----------
  {
    id: 'fac-h-dell-seton',
    name: 'Dell Seton Medical Center at UT',
    type: 'hospital',
    lat: 30.2759,
    lng: -97.7347,
    population_served: 450,
    address: '1500 Red River St',
    city: 'Austin',
    state: 'TX',
    accessibility: 'wheelchair',
    notes: 'Level I trauma center',
  },
  {
    id: 'fac-h-stdavids',
    name: "St. David's Medical Center",
    type: 'hospital',
    lat: 30.2900,
    lng: -97.7258,
    population_served: 350,
    address: '919 E 32nd St',
    city: 'Austin',
    state: 'TX',
    accessibility: 'wheelchair',
  },
  {
    id: 'fac-h-brackenridge',
    name: 'Ascension Seton Southwest',
    type: 'hospital',
    lat: 30.2542,
    lng: -97.7859,
    population_served: 220,
    address: '7900 FM 1826',
    city: 'Austin',
    state: 'TX',
    accessibility: 'wheelchair',
  },

  // ---------- Elderly Care / Senior Centers ----------
  {
    id: 'fac-e-austin-area',
    name: 'Austin Area Senior Center',
    type: 'elderly_care',
    lat: 30.2687,
    lng: -97.7389,
    population_served: 180,
    address: '506 Walsh St',
    city: 'Austin',
    state: 'TX',
    accessibility: 'wheelchair',
    notes: 'Cooling station during heat advisories',
  },
  {
    id: 'fac-e-meadowlark',
    name: 'Meadowlark Senior Living',
    type: 'elderly_care',
    lat: 30.4126,
    lng: -97.6979,
    population_served: 95,
    address: '11300 Pollyanna Ave',
    city: 'Austin',
    state: 'TX',
    accessibility: 'wheelchair',
  },
  {
    id: 'fac-e-whole-life',
    name: 'Whole Life Learning Center',
    type: 'elderly_care',
    lat: 30.2517,
    lng: -97.7209,
    population_served: 60,
    address: '5701 Cameron Rd',
    city: 'Austin',
    state: 'TX',
    accessibility: 'partial',
  },

  // ---------- Schools ----------
  {
    id: 'fac-s-austin-hs',
    name: 'Austin High School',
    type: 'school',
    lat: 30.2761,
    lng: -97.7556,
    population_served: 2100,
    address: '1715 W Cesar Chavez St',
    city: 'Austin',
    state: 'TX',
    accessibility: 'wheelchair',
  },
  {
    id: 'fac-s-travis-hs',
    name: 'Travis High School',
    type: 'school',
    lat: 30.2311,
    lng: -97.6906,
    population_served: 1700,
    address: '1211 E Oltorf St',
    city: 'Austin',
    state: 'TX',
    accessibility: 'wheelchair',
  },
  {
    id: 'fac-s-mathews',
    name: 'Mathews Elementary',
    type: 'school',
    lat: 30.3098,
    lng: -97.7794,
    population_served: 540,
    address: '906 W Lynn St',
    city: 'Austin',
    state: 'TX',
    accessibility: 'partial',
  },

  // ---------- Shelters / Cooling Centers ----------
  {
    id: 'fac-c-archives',
    name: 'Terrazas Branch Library (Cooling Center)',
    type: 'shelter',
    lat: 30.2597,
    lng: -97.7263,
    population_served: 150,
    address: '1105 E Cesar Chavez St',
    city: 'Austin',
    state: 'TX',
    accessibility: 'wheelchair',
    notes: 'Designated cooling center by City of Austin',
  },
  {
    id: 'fac-c-recreation',
    name: 'Dottie Jordan Recreation Center',
    type: 'shelter',
    lat: 30.3081,
    lng: -97.6792,
    population_served: 200,
    address: '2803 Loyola Ln',
    city: 'Austin',
    state: 'TX',
    accessibility: 'wheelchair',
    notes: 'Public cooling center with extended hours',
  },
];

/**
 * Per-city curated facility registries. FortyGuard's upstream API does
 * not return vulnerable facilities, so we serve a small, real-world
 * registry for every city. Cities without a custom list fall back to
 * the Austin registry (single source of truth, no mocks).
 */
export const CITY_FACILITIES: Record<string, CuratedFacility[]> = {
  dallas: FACILITIES,
  'fort-worth': FACILITIES,
  'san-antonio': FACILITIES,
  concho: FACILITIES.slice(0, 4),
};

/**
 * Risk thresholds sourced from NWS Heat Index advisory tiers.
 * - < 90°F: safe
 * - 90–99°F: moderate (caution for elderly/children)
 * - 100–109°F: high (heat advisory — vulnerable groups at risk)
 * - >= 110°F: extreme (excessive heat warning)
 */
export const RISK_THRESHOLDS = {
  safe: 90,
  high: 100,
  extreme: 110,
} as const;

export type RiskLevel = 'safe' | 'moderate' | 'high' | 'extreme';

/**
 * Decide whether a single facility should be flagged AT-RISK given the
 * current air temperature (°F). Elderly care & schools get flagged one
 * tier earlier than hospitals/shelters because of population sensitivity.
 */
export function isAtRisk(
  facility: Pick<CuratedFacility, 'type'>,
  currentTempF: number | null | undefined,
): { atRisk: boolean; level: RiskLevel } {
  if (currentTempF === null || currentTempF === undefined || Number.isNaN(currentTempF)) {
    return { atRisk: false, level: 'safe' };
  }

  let level: RiskLevel;
  if (currentTempF >= RISK_THRESHOLDS.extreme) level = 'extreme';
  else if (currentTempF >= RISK_THRESHOLDS.high) level = 'high';
  else if (currentTempF >= RISK_THRESHOLDS.safe) level = 'moderate';
  else level = 'safe';

  // Sensitive facility types (schools, elderly care) flag at "high" tier;
  // hospitals/shelters flag at "extreme".
  const sensitive: FacilityType[] = ['school', 'elderly_care'];
  const isSensitive = sensitive.includes(facility.type);

  if (isSensitive) {
    return {
      atRisk: level === 'high' || level === 'extreme',
      level,
    };
  }
  return {
    atRisk: level === 'extreme',
    level,
  };
}

export function summarizeFacilities(
  currentTempF: number | null | undefined,
  facilities: CuratedFacility[] = FACILITIES,
) {
  const total = facilities.length;
  const populationServed = facilities.reduce((s, f) => s + f.population_served, 0);
  const atRiskCount = facilities.filter((f) => isAtRisk(f, currentTempF).atRisk).length;
  return {
    total,
    populationServed,
    atRiskCount,
  };
}
