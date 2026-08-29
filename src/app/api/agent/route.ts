// ============================================================
// HeatGuard AI — AI Agent Route (multi-city aware)
// Builds a LIVE data table for ALL 4 cities before asking Qwen3.6,
// then forces the model to answer using the city the user mentions
// (or the currently selected city if none is mentioned).
//
// Flow:
//   1. Read { messages, cityId, model, max_tokens, temperature, stream }
//   2. Fetch /api/fortyguard?city=<id> in parallel for every city
//   3. Build a system prompt that contains the live table + rules
//   4. Proxy to the CoE AI Gateway with that system prompt
// ============================================================

import { NextResponse } from 'next/server';
import { CITIES } from '@/lib/cities';

const AI_KEY = process.env.AI_KEY || '';
const AI_BASE_URL = (process.env.AI_BASE_URL || 'https://ai.tcetcercd.in/v1').replace(/\/$/, '');

// Per-IP rate limit (cheap in-memory cap to prevent abuse).
const requestCounts = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const existing = requestCounts.get(ip);
  if (!existing || now > existing.resetAt) {
    requestCounts.set(ip, { count: 1, resetAt: now + 60000 });
    return true;
  }
  if (existing.count >= 100) return false;
  existing.count++;
  return true;
}
function getIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0] || 'unknown';
}

// Fetch one city's live FortyGuard payload from our own Next.js route.
// Returns a normalized row { name, temp, air, risk } so the prompt is
// independent of FortyGuard's exact schema variations.
async function fetchCityLive(origin: string, cityId: string): Promise<{
  name: string; temp: number | null; air: number | null; risk: string;
}> {
  const city = CITIES.find((c) => c.id === cityId) || CITIES[2];
  try {
    // POST first (matches the existing /api/fortyguard handler), fall back to GET on 405.
    let r = await fetch(`${origin}/api/fortyguard?city=${encodeURIComponent(cityId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(20000),
    });
    if (r.status === 405) {
      r = await fetch(`${origin}/api/fortyguard?city=${encodeURIComponent(cityId)}`, {
        signal: AbortSignal.timeout(20000),
      });
    }
    const j: any = await r.json().catch(() => ({}));
    const d = j?.data ?? j ?? {};
    const temp =
      (typeof d.temperature === 'object' ? d.temperature?.value : d.temperature) ??
      d.surface_temperature ??
      null;
    const air = d.air_temperature ?? null;
    const risk = (d.risk_level || 'unknown').toString().toLowerCase();
    return { name: city.name, temp, air, risk };
  } catch {
    return { name: city.name, temp: null, air: null, risk: 'unknown' };
  }
}

export async function POST(req: Request) {
  const ip = getIp(req);
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ success: false, error: 'Rate limit exceeded. Max 100 req/min per IP.' }, { status: 429 });
  }

  const startTime = Date.now();

  // Body: { messages, cityId, model?, max_tokens?, temperature?, stream? }
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const {
    messages,
    cityId = 'dallas',
    model = 'qwen3.6',
    max_tokens = 500,
    temperature = 0.7,
    stream = false,
  } = body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ success: false, error: 'Messages array is required' }, { status: 400 });
  }

  if (!AI_KEY) {
    return NextResponse.json({
      success: false,
      error: 'AI_KEY is not configured in .env.local',
      httpStatus: 401,
    }, { status: 401 });
  }

  // Build origin so this works on localhost AND on Vercel/preview/prod.
  const origin = new URL(req.url).origin;

  // 🚨 THE FIX: fetch LIVE data for ALL 4 cities in parallel.
  const live = await Promise.all(CITIES.map((c) => fetchCityLive(origin, c.id)));

  const selectedName = CITIES.find((c) => c.id === cityId)?.name || 'Dallas';
  const dataTable = live
    .map((l) => `- ${l.name}: surface ${l.temp ?? 'N/A'}°F, air ${l.air ?? 'N/A'}°F, risk level: ${l.risk}`)
    .join('\n');

  const systemPrompt = `You are HeatGuard AI, an autonomous urban climate agent for Texas, powered by LIVE hyperlocal data from the FortyGuard Temperature API.

LIVE CITY DATA (fetched seconds ago — this is the ONLY source of truth):
${dataTable}

City currently selected in the user's dashboard: ${selectedName}

STRICT RULES:
1. If the user's question mentions a city (Dallas, Fort Worth, San Antonio, Concho County), answer using ONLY that city's row from the LIVE CITY DATA table. NEVER answer with another city's numbers.
2. If the user does not mention any city, answer about the selected city (${selectedName}).
3. Always state the city name, its exact temperature, and its risk level in your answer.
4. Keep answers to 2-4 sentences, professional and concise.
5. If the user asks for a safe/cool route, or mentions elderly, children, asthma, dogs, or health concerns: recommend the Safe Route and END your reply with [ACTION:SAFE]
6. If the user explicitly demands the fastest route: warn about heat exposure, then END with [ACTION:FAST]`;

  // Sanitize user messages — strip any client-supplied "system" messages so they
  // can't override our server-built prompt.
  const userMessages = messages
    .filter((m: any) => m && (m.role === 'user' || m.role === 'assistant'))
    .map((m: any) => ({ role: m.role, content: typeof m.content === 'string' ? m.content : '' }));

  const payload = {
    model,
    messages: [{ role: 'system', content: systemPrompt }, ...userMessages],
    max_tokens,
    temperature,
    stream,
  };

  let reply: string | null = null;
  for (let attempt = 1; attempt <= 2 && !reply; attempt++) {
    try {
      const res = await fetch(`${AI_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': AI_KEY, Authorization: `Bearer ${AI_KEY}` },
        body: JSON.stringify({ model: 'qwen3.6', messages: [{ role: 'system', content: systemPrompt }, ...userMessages], max_tokens: 500 }),
        signal: AbortSignal.timeout(25000),
      });
      const ct = res.headers.get('content-type') || '';
      const text = await res.text();
      // ✅ Only accept real JSON — reject Cloudflare HTML error pages (520/502)
      if (res.ok && ct.includes('application/json') && !text.trim().startsWith('<')) {
        const j = JSON.parse(text);
        reply = j?.choices?.[0]?.message?.content ?? null;
      } else {
        console.log(`[AI Agent] attempt ${attempt} → HTTP ${res.status} (non-JSON body)`);
      }
    } catch (e: any) {
      console.log(`[AI Agent] attempt ${attempt} error: ${e.message}`);
    }
    if (!reply && attempt < 2) await new Promise(r => setTimeout(r, 2000));
  }

  // ✅ OFFLINE FALLBACK — campus gateway down → answer from LIVE city data
  if (!reply) {
    const last = String(messages[messages.length - 1]?.content || '').toLowerCase();
    const c = live.find(x => last.includes(x.name.toLowerCase().split(' ')[0])) || live.find(x => x.name.toLowerCase().includes(selectedName.toLowerCase())) || live[0];
    const safe = /fast|route|safe|walk|elderly|child|dog/.test(last);
    reply = `⚡ Campus AI gateway is busy right now — answering from live FortyGuard city data: ${c?.name ?? 'The city'} is at ${c?.temp ?? '—'}°F surface with ${c?.risk ?? 'moderate'} risk. ${safe ? 'I recommend the shaded Safe Route and hydration breaks every 20 minutes. [ACTION:SAFE]' : 'Limit outdoor exposure 12–5 PM and check on elderly residents.'}`;
  }

  return NextResponse.json({
    success: true,
    content: reply,
    reply,
    latency: Date.now() - startTime,
    liveTable: dataTable,
    selectedCity: selectedName,
  });
}

export async function GET() {
  return NextResponse.json({ success: false, error: 'Use POST { messages, cityId }' }, { status: 405 });
}
