// ============================================================
// HeatGuard AI — API Route: 7-Day Historical Temperature Series
// Submits one FortyGuard heat_intelligence job per day for the
// past 7 days, polls each job until complete or timeout, and
// returns whatever real surface_temperature / air_temperature
// values FortyGuard provides.
//
// IMPORTANT: This endpoint does NOT fabricate values. If FortyGuard
// does not return surface/air data within the timeout window, the
// `surface` / `air` fields for that day are returned as `null`.
// The client is expected to hide empty chart panels (per dashboard
// rules) rather than invent numbers.
// ============================================================

import { NextResponse } from 'next/server';
import { getCity } from '@/lib/cities';

const FORTYGUARD_API_KEY = (process.env.FORTYGUARD_API_KEY || '').replace(/^["']|["']$/g, '').trim();
const FORTYGUARD_BASE_URL = (process.env.FORTYGUARD_BASE_URL || 'https://api.fortyguard.com/v1').replace(/\/$/, '').trim();

interface HistoryCache {
  at: number;
  series: Array<{ date: string; surface: number | null; air: number | null }>;
}

let cache: HistoryCache | null = null;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
let cachedCityId: string | null = null;

function last7Days(): string[] {
  const days: string[] = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }
  return days;
}

async function submitHeatIntelligence(date: string, lat: number, lng: number, location: string): Promise<string | null> {
  try {
    const res = await fetch(`${FORTYGUARD_BASE_URL}/heat_intelligence`, {
      method: 'POST',
      headers: {
        'api-key': FORTYGUARD_API_KEY,
        Authorization: `Bearer ${FORTYGUARD_API_KEY}`,
        'X-API-Key': FORTYGUARD_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        latitude: lat,
        longitude: lng,
        temperature: 95.0,
        date,
        analysis: ['environmental'], // FortyGuard requires LIST of enum strings
        location,
      }),
      signal: AbortSignal.timeout(15000),
    });
    const text = await res.text();
    if (!res.ok) return null;
    const parsed = JSON.parse(text);
    const activityId = parsed?.data?.activity_id ?? parsed?.activity_id ?? null;
    return activityId;
  } catch {
    return null;
  }
}

async function pollOnce(activityId: string): Promise<any | null> {
  try {
    const res = await fetch(`${FORTYGUARD_BASE_URL}/status/${activityId}`, {
      method: 'GET',
      headers: {
        'api-key': FORTYGUARD_API_KEY,
        Authorization: `Bearer ${FORTYGUARD_API_KEY}`,
        'X-API-Key': FORTYGUARD_API_KEY,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    });
    const text = await res.text();
    if (!res.ok) return null;
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function waitForResult(activityId: string, maxAttempts = 4, delayMs = 4000): Promise<any | null> {
  for (let i = 0; i < maxAttempts; i++) {
    const poll = await pollOnce(activityId);
    const status = (poll?.data?.status || poll?.status || '').toLowerCase();
    if (status === 'completed' || status === 'success') return poll;
    if (status === 'failed' || poll?.data?.error) return null;
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return null;
}

function extractTemps(payload: any): { surface: number | null; air: number | null } {
  // FortyGuard's completed activity shape: { data: { surface_temperature, air_temperature, temperature, ... } }
  const data = payload?.data ?? payload ?? {};
  const surface =
    typeof data.surface_temperature === 'number'
      ? data.surface_temperature
      : typeof data.surface_temp === 'number'
      ? data.surface_temp
      : null;
  const air =
    typeof data.air_temperature === 'number'
      ? data.air_temperature
      : typeof data.air_temp === 'number'
      ? data.air_temp
      : typeof data.temperature_2m === 'number'
      ? data.temperature_2m
      : null;
  return { surface, air };
}

export async function POST(req: Request) {
  if (!FORTYGUARD_API_KEY) {
    return NextResponse.json({ success: false, error: 'FORTYGUARD_API_KEY not configured' }, { status: 500 });
  }

  const url = new URL(req.url);
  const cityId = url.searchParams.get('city') || 'dallas';
  const city = getCity(cityId);
  const lat = city.lat;
  const lng = city.lon;
  const location = city.name;

  // Cache is per-city — different cities have different historical payloads.
  if (cache && cachedCityId === cityId && Date.now() - cache.at < CACHE_TTL_MS) {
    return NextResponse.json({ success: true, series: cache.series, cached: true, city: cityId, cityName: city.name });
  }

  const days = last7Days();

  // Submit all 7 jobs in parallel
  const activityIds = await Promise.all(days.map((d) => submitHeatIntelligence(d, lat, lng, location)));

  // Poll each in parallel
  const results = await Promise.all(
    days.map(async (date, idx) => {
      const aid = activityIds[idx];
      if (!aid) return { date, surface: null as number | null, air: null as number | null };
      const payload = await waitForResult(aid);
      if (!payload) return { date, surface: null as number | null, air: null as number | null };
      return { date, ...extractTemps(payload) };
    }),
  );

  cache = { at: Date.now(), series: results };
  cachedCityId = cityId;
  return NextResponse.json({ success: true, series: results, cached: false, city: cityId, cityName: city.name });
}

export async function GET(req: Request) {
  return POST(req);
}
