import { NextResponse } from 'next/server';
import { getCity } from '@/lib/cities';

const num = (o: any, ks: string[]) => { for (const k of ks) if (typeof o?.[k] === 'number') return o[k]; return null; };

// Finds any array of {time-ish + temp-ish} points anywhere in the response
function extractHours(j: any) {
  let best: any[] = [];
  const isPoint = (o: any) =>
    num(o, ['temperature', 'temp', 'value', 'temperature_f']) != null &&
    (o.hour != null || o.time != null || o.timestamp != null || o.datetime != null || o.date_time != null);
  const walk = (n: any, d = 0) => {
    if (d > 6) return;
    if (Array.isArray(n)) { const c = n.filter(isPoint); if (c.length > best.length) best = c; n.forEach(x => walk(x, d + 1)); }
    else if (n && typeof n === 'object') Object.values(n).forEach(v => walk(v, d + 1));
  };
  walk(j);
  return best.map(p => ({
    label: String(p.hour ?? p.time ?? p.timestamp ?? p.datetime ?? p.date_time ?? '').substring(0, 16),
    t: num(p, ['temperature', 'temp', 'value', 'temperature_f']),
  }));
}

export async function GET(req: Request) {
  const city = getCity(new URL(req.url).searchParams.get('city') || 'san-antonio');
  const API_KEY = process.env.FORTYGUARD_API_KEY;
  const BASE_URL = process.env.FORTYGUARD_BASE_URL || 'https://api.fortyguard.com/v1';
  if (!API_KEY) return NextResponse.json({ error: 'Missing key' }, { status: 500 });

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  headers['api-key'] = API_KEY;
  headers['Authorization'] = `Bearer ${API_KEY}`;
  headers['X-API-Key'] = API_KEY;
  const today = new Date().toISOString().split('T')[0];
  const attempts: any[] = [];

  const combos = [
    { name: 'POST /heat_intelligence hours_ahead=12, analysis=[env]', url: `${BASE_URL}/heat_intelligence`, body: { latitude: city.lat, longitude: city.lon, temperature: 95, date: today, hours_ahead: 12, analysis: ['environmental'], location: city.name } },
    { name: 'POST /heat_intelligence hours=12, analysis=[env]', url: `${BASE_URL}/heat_intelligence`, body: { latitude: city.lat, longitude: city.lon, temperature: 95, date: today, hours: 12, analysis: ['environmental'], location: city.name } },
    { name: 'POST /heat_intelligence forecast_hours=12', url: `${BASE_URL}/heat_intelligence`, body: { latitude: city.lat, longitude: city.lon, temperature: 95, date: today, forecast_hours: 12, analysis: ['environmental'], location: city.name } },
  ];

  for (const c of combos) {
    try {
      const method = c.body ? 'POST' : 'GET';
      const init: RequestInit = { method, headers };
      if (c.body) init.body = JSON.stringify(c.body);
      const r = await fetch(c.url, init);
      const raw = await r.text();
      console.log(`🔮 [${c.name}] → ${r.status}: ${raw.substring(0, 300)}`);
      attempts.push({ name: c.name, status: r.status, raw: raw.substring(0, 300) });
      if (r.ok) {
        const hours = extractHours(JSON.parse(raw));
        if (hours.length) {
          return NextResponse.json({ city: city.name, source: 'live-forecast', shape: c.name, hours, series: hours, data: hours });
        }
      }
    } catch (e: any) { attempts.push({ name: c.name, error: e.message }); }
  }

  return NextResponse.json({ city: city.name, source: 'probing', attempts, hours: [] });
}