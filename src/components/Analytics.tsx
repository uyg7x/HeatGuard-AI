// ============================================================
// HeatGuard AI — Analytics Tab
// Per-city stats + cross-city comparison + four insight panels
// (UHI scatter, risk-mix donut, leaderboard, AI planner).
// ZERO MOCK DATA POLICY COMPLIANT
// ============================================================

'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  ScatterChart, Scatter, ZAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  TrendingUp, AlertTriangle, BarChart3, Activity, Layers, MapPin,
  Sparkles, RefreshCw, Trophy, Loader2,
} from 'lucide-react';
import { FortyGuardTemperatureData } from '../lib/types';
import { formatTemperature, getRiskLevelInfo } from '../lib/utils';
import { CITIES, getCity } from '../lib/cities';
import ErrorCard from './ErrorCard';

interface AnalyticsProps {
  data: FortyGuardTemperatureData | null;
  loading: boolean;
  error: any;
  onRetry: () => void;
  cityId?: string;
  cityStats?: {
    current: number;
    peak: number;
    min: number;
    mean: number;
    std: number;
    hotCells: number;
    totalCells: number;
    capturedAt: string;
    distribution: Array<{ range: string; count: number; mid: number }>;
    cityName?: string;
    risk?: string;
  } | null;
}

const RISK_COLORS: Record<string, string> = {
  safe: '#10B981',
  moderate: '#F59E0B',
  high: '#F97316',
  extreme: '#EF4444',
};

const ALL_CITY_IDS = CITIES.map((c) => c.id);

// --- helpers ---

// Haversine distance (km) between two lat/lng points.
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

const tooltipStyle = {
  backgroundColor: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  fontSize: '12px',
  color: '#0f172a',
};

// === Component ===
const Analytics: React.FC<AnalyticsProps> = ({ data, loading, error, onRetry, cityId = 'dallas', cityStats }) => {
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('7d');
  const [comparison, setComparison] = useState<Array<{ id: string; name: string; current: number; peak: number; min: number; std: number; mean: number; hotCells: number; totalCells: number }>>([]);
  const [comparisonLoading, setComparisonLoading] = useState(true);
  const [uhiCells, setUhiCells] = useState<Array<{ km: number; temp: number }>>([]);
  const [uhiLoading, setUhiLoading] = useState(true);

  // AI Planner Insights state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiBullets, setAiBullets] = useState<string[] | null>(null);

  // -- Fetch /api/fortyguard for ALL cities in parallel (cached server-side) --
  useEffect(() => {
    let cancelled = false;
    const fetchAll = async () => {
      setComparisonLoading(true);
      try {
        const results = await Promise.all(
          ALL_CITY_IDS.map(async (id) => {
            try {
              const r = await fetch(`/api/fortyguard?city=${encodeURIComponent(id)}`, { method: 'POST' });
              const j = await r.json();
              const s = j?.cityStats;
              return {
                id,
                name: s?.cityName || j?.cityName || id,
                current: typeof s?.current === 'number' ? s.current : 0,
                peak: typeof s?.peak === 'number' ? s.peak : 0,
                min: typeof s?.min === 'number' ? s.min : 0,
                std: typeof s?.std === 'number' ? s.std : 0,
                mean: typeof s?.mean === 'number' ? s.mean : 0,
                hotCells: typeof s?.hotCells === 'number' ? s.hotCells : 0,
                totalCells: typeof s?.totalCells === 'number' ? s.totalCells : 0,
              };
            } catch {
              return { id, name: id, current: 0, peak: 0, min: 0, std: 0, mean: 0, hotCells: 0, totalCells: 0 };
            }
          })
        );
        if (!cancelled) setComparison(results);
      } finally {
        if (!cancelled) setComparisonLoading(false);
      }
    };
    fetchAll();
    return () => { cancelled = true; };
  }, [cityId]);

  // -- Fetch heatmap cells for the active city (UHI scatter) --
  useEffect(() => {
    let cancelled = false;
    const fetchCells = async () => {
      setUhiLoading(true);
      try {
        const r = await fetch(`/api/heatmap?city=${encodeURIComponent(cityId)}`, { method: 'POST' });
        const j = await r.json();
        const cells: Array<{ lat: number; lng: number; temperature: number }> =
          j?.data?.heatmap_data || j?.heatmap_data || j?.data?.cells || j?.cells || [];
        const center = getCity(cityId);
        const points = cells
          .filter((c) => typeof c.temperature === 'number' && typeof c.lat === 'number' && typeof c.lng === 'number')
          .map((c) => ({
            km: Number(haversineKm(center.lat, center.lon, c.lat, c.lng).toFixed(3)),
            temp: c.temperature,
          }));
        if (!cancelled) setUhiCells(points);
      } catch {
        if (!cancelled) setUhiCells([]);
      } finally {
        if (!cancelled) setUhiLoading(false);
      }
    };
    fetchCells();
    return () => { cancelled = true; };
  }, [cityId]);

  // -- AI Planner Insights handler --
  const generateInsights = useCallback(async () => {
    setAiLoading(true);
    setAiError(null);
    setAiBullets(null);
    try {
      const compactStats = comparison
        .filter((c) => c.totalCells > 0)
        .map((c) => ({
          city: c.name,
          peak: c.peak,
          mean: c.mean,
          min: c.min,
          std: c.std,
          hotCells: c.hotCells,
          totalCells: c.totalCells,
        }));

      const r = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cityId,
          model: 'qwen3.6',
          max_tokens: 500,
          temperature: 0.5,
          messages: [
            {
              role: 'user',
              content:
                `LIVE cityStats across 4 Texas cities (JSON):\n${JSON.stringify(compactStats)}\n\n` +
                `Return EXACTLY 3 bullet recommendations, each under 25 words, numbered 1-3.`,
            },
          ],
        }),
      });
      const j = await r.json();
      if (!r.ok || !j?.success) {
        throw new Error(j?.error || `AI Gateway error (HTTP ${r.status})`);
      }
      const content: string = j.content || j.reply || '';
      // Parse numbered bullets "1. ..." / "2. ..." / "3. ..."
      const parsed = content
        .split(/\n+/)
        .map((line) => line.replace(/^\s*[\-\*\u2022]\s*/, '').trim())
        .filter((line) => /^\d+\./.test(line))
        .map((line) => line.replace(/^\d+\.\s*/, '').trim())
        .slice(0, 3);
      if (parsed.length === 0) {
        throw new Error('AI Gateway returned no numbered bullets.');
      }
      setAiBullets(parsed);
    } catch (e: any) {
      setAiError(
        e?.message?.includes('502') || e?.message?.toLowerCase().includes('timeout')
          ? 'AI Gateway timed out — please try again in 30 seconds.'
          : (e?.message || 'Failed to generate insights.')
      );
    } finally {
      setAiLoading(false);
    }
  }, [comparison, cityId]);

  // -- Safe fallback object so subsequent hooks can run unconditionally --
  const safeData: FortyGuardTemperatureData = data ?? {
    location: 'Unknown',
    temperature: { value: 0, unit: '°F', measurement_height: '2m above ground', resolution: '10 mi² hyperlocal' },
    risk_level: 'safe',
    air_temperature: 0,
    surface_temperature: 0,
    humidity: 0,
    wind_speed: 0,
    uv_index: 0,
    measured_at: new Date().toISOString(),
  };

  const kpiStats = useMemo(() => {
    if (cityStats) {
      return { peak: cityStats.peak, min: cityStats.min, mean: cityStats.mean, stdDev: cityStats.std };
    }
    const v = safeData.temperature?.value ?? 0;
    return { peak: v, min: v, mean: v, stdDev: 0 };
  }, [cityStats, safeData.temperature]);

  const exceedances = useMemo(
    () =>
      (safeData.exceedance_data || []).map((e) => ({
        threshold: `>${e.threshold}°F`,
        hours: e.hours_exceeded,
        days: e.days_exceeded,
        consecutive: e.consecutive_days,
        current: e.current_week_hours,
        previous: e.previous_week_hours,
      })),
    [safeData.exceedance_data]
  );

  const distributionChartData = useMemo(() => {
    if (cityStats?.distribution && cityStats.distribution.length > 0) {
      return cityStats.distribution.map((d) => ({ range: d.range, count: d.count }));
    }
    const d = safeData.distribution_data || [];
    if (d.length > 0) return d.map((x) => ({ range: `${x.temperature.toFixed(0)}°F`, count: 1 }));
    return [];
  }, [cityStats, safeData.distribution_data]);

  const riskBreakdown = useMemo(() => {
    const counts: Record<string, number> = { safe: 0, moderate: 0, high: 0, extreme: 0 };
    (safeData.zones || []).forEach((z) => {
      const k = (z.risk_level || 'safe').toLowerCase();
      if (counts[k] !== undefined) counts[k]++;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [safeData.zones]);

  // === UHI Scatter regression slope (°F per km toward downtown) ===
  const uhiRegression = useMemo(() => {
    if (uhiCells.length < 2) return { slope: 0, intercept: 0, n: uhiCells.length };
    const n = uhiCells.length;
    const xs = uhiCells.map((p) => p.km);
    const ys = uhiCells.map((p) => p.temp);
    const xMean = xs.reduce((s, x) => s + x, 0) / n;
    const yMean = ys.reduce((s, y) => s + y, 0) / n;
    let num = 0;
    let den = 0;
    for (let i = 0; i < n; i++) {
      num += (xs[i] - xMean) * (ys[i] - yMean);
      den += (xs[i] - xMean) ** 2;
    }
    const slope = den === 0 ? 0 : num / den;
    const intercept = yMean - slope * xMean;
    return { slope, intercept, n };
  }, [uhiCells]);

  // === Risk-Mix Donut (4 bands from cell distribution) ===
  const riskBands = useMemo(() => {
    let safe = 0, moderate = 0, high = 0, extreme = 0;
    // Use the captured histogram if available (cityStats.distribution uses bucket midpoints)
    if (cityStats?.distribution && cityStats.distribution.length > 0) {
      cityStats.distribution.forEach((d) => {
        const mid = d.mid ?? 0;
        if (mid < 95) safe += d.count;
        else if (mid < 105) moderate += d.count;
        else if (mid < 115) high += d.count;
        else extreme += d.count;
      });
    } else if (uhiCells.length > 0) {
      uhiCells.forEach((c) => {
        if (c.temp < 95) safe++;
        else if (c.temp < 105) moderate++;
        else if (c.temp < 115) high++;
        else extreme++;
      });
    } else if (distributionChartData.length > 0 && cityStats?.distribution) {
      // fallback already handled above
    }
    const total = safe + moderate + high + extreme;
    const hotPct = total > 0 ? Math.round(((high + extreme) / total) * 100) : 0;
    return {
      data: [
        { name: 'safe', label: 'SAFE', value: safe, color: '#10B981' },
        { name: 'moderate', label: 'MODERATE', value: moderate, color: '#f59e0b' },
        { name: 'high', label: 'HIGH', value: high, color: '#f97316' },
        { name: 'extreme', label: 'EXTREME', value: extreme, color: '#dc2626' },
      ],
      total,
      hotPct,
    };
  }, [cityStats, uhiCells, distributionChartData]);

  // === City Heat-Stress Leaderboard ===
  const leaderboard = useMemo(() => {
    if (comparison.length === 0) return [];
    const rows = comparison
      .filter((c) => c.totalCells > 0)
      .map((c) => {
        const pctHot110 = c.totalCells > 0 ? (c.hotCells / c.totalCells) * 100 : 0;
        const score = 0.5 * c.peak + 0.3 * c.mean + 0.2 * pctHot110;
        return { ...c, pctHot110, score };
      })
      .sort((a, b) => b.score - a.score);
    return rows;
  }, [comparison]);

  const hottestCity = leaderboard[0]?.name || '—';
  const maxScore = leaderboard.reduce((m, r) => Math.max(m, r.score), 1);

  // === Conditional returns AFTER all hooks ===
  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
            <div className="skeleton-shimmer h-4 w-32 rounded mb-3" />
            <div className="skeleton-shimmer h-48 w-full rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (error || !data) {
    return <ErrorCard error={error || { message: 'No FortyGuard API data available for analytics' }} onRetry={onRetry} title="Analytics Unavailable" />;
  }

  const activeCityName = cityStats?.cityName || safeData.location || cityId;

  return (
    <div className="space-y-4">
      {/* KPI Summary Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI icon={<TrendingUp className="w-4 h-4" />} label="Peak Temperature" value={formatTemperature(kpiStats.peak)} accent="text-red-400" />
        <KPI icon={<Activity className="w-4 h-4" />} label="Mean Temperature" value={formatTemperature(kpiStats.mean)} accent="text-orange-400" />
        <KPI icon={<AlertTriangle className="w-4 h-4" />} label="Min Temperature" value={formatTemperature(kpiStats.min)} accent="text-emerald-400" />
        <KPI icon={<BarChart3 className="w-4 h-4" />} label="Std Deviation" value={`±${kpiStats.stdDev.toFixed(2)}°F`} accent="text-amber-400" />
      </div>

      {/* Snapshot badge */}
      {cityStats && (
        <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
          <div className="flex items-center gap-1.5">
            <Layers className="w-3 h-3 text-orange-500" />
            FortyGuard heatmap snapshot · {new Date(cityStats.capturedAt).toLocaleString()} · {cityStats.totalCells} cells
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3 h-3 text-orange-500" />
            {cityStats.cityName || safeData.location}
          </div>
        </div>
      )}

      {/* PANEL 1 + PANEL 2: UHI Scatter | Risk-Mix Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* PANEL 1 — UHI GRADIENT SCATTER */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-slate-900">
              <Activity className="w-4 h-4 text-orange-500" /> Urban Heat Island Gradient
            </h3>
            <span className="text-[10px] text-slate-500">{uhiCells.length} cells</span>
          </div>
          <p className="text-[10px] text-slate-500 mb-3">
            Each dot = one hyperlocal cell. x = distance from downtown (km). y = surface temperature (°F).
          </p>
          {uhiLoading ? (
            <div className="skeleton-shimmer h-[220px] w-full rounded" />
          ) : uhiCells.length < 2 ? (
            <div className="h-[220px] flex items-center justify-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
              No heatmap cells returned for this city.
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <ScatterChart margin={{ top: 8, right: 12, left: -8, bottom: 8 }}>
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                  <XAxis
                    type="number"
                    dataKey="km"
                    name="Distance"
                    unit="km"
                    stroke="#64748b"
                    tick={{ fontSize: 10 }}
                    label={{ value: 'km from downtown', position: 'insideBottom', offset: -2, fill: '#64748b', fontSize: 10 }}
                  />
                  <YAxis
                    type="number"
                    dataKey="temp"
                    name="Temp"
                    unit="°F"
                    stroke="#64748b"
                    tick={{ fontSize: 10 }}
                    domain={['auto', 'auto']}
                  />
                  <ZAxis range={[20, 20]} />
                  <Tooltip
                    cursor={{ strokeDasharray: '3 3' }}
                    contentStyle={tooltipStyle}
                    formatter={(value: any, name: any) => [`${Number(value).toFixed(2)}${name === 'Temp' ? '°F' : ' km'}`, String(name ?? '')]}
                  />
                  <Scatter data={uhiCells} fill="#f97316" fillOpacity={0.5} />
                </ScatterChart>
              </ResponsiveContainer>
              <p className="mt-2 text-[11px] text-slate-600 italic">
                Urban Heat Island: heat rises{' '}
                <span className="font-semibold text-orange-600">{uhiRegression.slope.toFixed(2)}°F</span>{' '}
                per km toward downtown {activeCityName}.
              </p>
            </>
          )}
        </div>

        {/* PANEL 2 — RISK-MIX DONUT */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-slate-900">
              <AlertTriangle className="w-4 h-4 text-orange-500" /> Risk-Mix (Cell Bands)
            </h3>
            <span className="text-[10px] text-slate-500">{riskBands.total} cells</span>
          </div>
          <p className="text-[10px] text-slate-500 mb-3">
            Cells classified by temperature: &lt;95 SAFE · 95–105 MODERATE · 105–115 HIGH · &gt;115 EXTREME
          </p>
          {riskBands.total === 0 ? (
            <div className="h-[220px] flex items-center justify-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
              No cell data available.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              <div className="relative">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={riskBands.data} dataKey="value" innerRadius={60} outerRadius={88} paddingAngle={2}>
                      {riskBands.data.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: any, n: any) => [v, n]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <div className="text-2xl font-bold text-orange-600">{riskBands.hotPct}%</div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-500">HIGH+EXTREME</div>
                </div>
              </div>
              <div className="space-y-2">
                {riskBands.data.map((r) => (
                  <div key={r.name} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ background: r.color }} aria-hidden="true" />
                      <span className="text-xs font-medium text-slate-700">{r.label}</span>
                    </div>
                    <span className="text-sm font-bold text-slate-900">{r.value} cells</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* PANEL 3 + PANEL 4: Leaderboard | AI Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* PANEL 3 — CITY HEAT-STRESS LEADERBOARD */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-slate-900">
              <Trophy className="w-4 h-4 text-orange-500" /> Heat-Stress Leaderboard
            </h3>
            <span className="text-[10px] text-slate-500">score = 0.5·peak + 0.3·mean + 0.2·%cells≥100</span>
          </div>
          {comparisonLoading ? (
            <div className="skeleton-shimmer h-[220px] w-full rounded" />
          ) : leaderboard.length === 0 ? (
            <div className="h-[220px] flex items-center justify-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
              No leaderboard data
            </div>
          ) : (
            <>
              <div className="mb-3 text-xs text-slate-700">
                Hottest city right now:{' '}
                <span className="font-bold text-orange-600">{hottestCity}</span>
              </div>
              <div className="space-y-2.5">
                {leaderboard.map((row, idx) => {
                  const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`;
                  const widthPct = (row.score / maxScore) * 100;
                  return (
                    <div key={row.id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-base leading-none">{medal}</span>
                          <span className="font-medium text-slate-900">{row.name}</span>
                        </div>
                        <span className="font-bold tabular-nums text-slate-900">{row.score.toFixed(1)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${widthPct}%`,
                            background: 'linear-gradient(90deg, #fdba74 0%, #f97316 100%)',
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500">
                        <span>peak {row.peak.toFixed(1)}°F · mean {row.mean.toFixed(1)}°F</span>
                        <span>{row.pctHot110.toFixed(0)}% cells ≥100°F</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* PANEL 4 — AI PLANNER INSIGHTS */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-slate-900">
              <Sparkles className="w-4 h-4 text-violet-500" /> AI Planner Insights
            </h3>
            <button
              type="button"
              onClick={generateInsights}
              disabled={aiLoading || comparisonLoading}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-orange-500 hover:bg-orange-600 disabled:bg-slate-300 text-white text-[11px] font-semibold transition-colors"
              aria-label="Generate AI insights"
            >
              {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              {aiLoading ? 'Generating…' : '⚡ Generate AI Insights'}
            </button>
          </div>
          <p className="text-[10px] text-slate-500 mb-3">
            Cross-city planning recommendations powered by Qwen3.6 on the TCET CoE AI Gateway.
          </p>

          {aiLoading && (
            <div className="space-y-2" aria-live="polite">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="skeleton-shimmer h-5 w-5 rounded-full" />
                  <div className="skeleton-shimmer h-4 flex-1 rounded" />
                </div>
              ))}
            </div>
          )}

          {!aiLoading && aiError && (
            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
              {aiError}
              <button
                type="button"
                onClick={generateInsights}
                className="ml-2 inline-flex items-center gap-1 underline"
              >
                <RefreshCw className="w-3 h-3" /> retry
              </button>
            </div>
          )}

          {!aiLoading && aiBullets && aiBullets.length > 0 && (
            <ol className="space-y-2 text-xs text-slate-700">
              {aiBullets.map((b, i) => (
                <li key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <span>{b}</span>
                </li>
              ))}
            </ol>
          )}

          {!aiLoading && !aiBullets && !aiError && (
            <div className="h-[180px] flex items-center justify-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl text-center px-4">
              Click <span className="font-semibold mx-1 text-orange-600">⚡ Generate AI Insights</span> to get 3
              cross-city recommendations grounded in live FortyGuard data.
            </div>
          )}

          <div className="mt-3 pt-2 border-t border-slate-100 text-[10px] text-slate-500 italic text-right">
            Generated by Qwen3.6 · TCET CoE AI Gateway
          </div>
        </div>
      </div>

      {/* City Comparison (kept from before) + Exceedance + Distribution */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2 text-slate-900">
              <BarChart3 className="w-4 h-4 text-orange-500" /> City Comparison
            </h3>
            <span className="text-[10px] text-slate-500">
              Mean &amp; Peak surface temperature · 4 cities · live per-city stats
            </span>
          </div>
          <div className="text-[10px] text-slate-500">
            Active city: <span className="text-orange-600 font-bold">{activeCityName}</span>
          </div>
        </div>

        {comparisonLoading ? (
          <div className="skeleton-shimmer h-[260px] w-full rounded" />
        ) : comparison.length === 0 ? (
          <div className="h-[260px] flex items-center justify-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
            No comparison data
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={comparison.map((c) => ({ name: c.name, mean: c.current, peak: c.peak, min: c.min }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 10 }} unit="°F" />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="mean" name="Mean °F" fill="#F97316" radius={[4, 4, 0, 0]} />
              <Bar dataKey="peak" name="Peak °F" fill="#EF4444" radius={[4, 4, 0, 0]} />
              <Bar dataKey="min" name="Min °F" fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Exceedance + Distribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {exceedances.length > 0 && (
          <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-slate-900">
                <AlertTriangle className="w-4 h-4 text-red-500" /> Exceedance Analysis
              </h3>
              <span className="text-[10px] text-slate-500">Hours above critical threshold</span>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={exceedances}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="threshold" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="current" name="This Week" fill="#F97316" radius={[4, 4, 0, 0]} />
                <Bar dataKey="previous" name="Last Week" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {distributionChartData.length > 0 && (
          <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-slate-900">
                <BarChart3 className="w-4 h-4 text-emerald-600" /> Spatial Distribution
              </h3>
              <span className="text-[10px] text-slate-500">
                Cells by temperature bucket · from {cityStats?.totalCells ?? '—'} hyperlocal cells
              </span>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={distributionChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="range" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};

// (Excess import suppressor for unused symbols in some configs.)
void getRiskLevelInfo;

const KPI: React.FC<{ icon: React.ReactNode; label: string; value: string; accent: string }> = ({ icon, label, value, accent }) => (
  <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4">
    <div className={`flex items-center gap-2 ${accent}`}>
      {icon}
      <span className="text-[10px] uppercase tracking-wider text-slate-500">{label}</span>
    </div>
    <div className="text-2xl font-bold tabular-nums mt-2 text-slate-900">{value}</div>
  </div>
);

export default Analytics;