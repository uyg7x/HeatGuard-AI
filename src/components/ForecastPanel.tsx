// ============================================================
// HeatGuard AI — 12-Hour Forecast Panel
// Predicted peak temperature, expected risk level, and a sparkline
// of the next 12 hours from /api/forecast.
// ============================================================

'use client';

import React, { useEffect, useState } from 'react';
import { Clock, TrendingUp, AlertTriangle, Activity, Sparkles } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { getRiskLevelInfo, formatTemperature } from '../lib/utils';
import ErrorCard from './ErrorCard';

interface ForecastPoint {
  hour_offset: number;
  timestamp: string;
  temperature: number | null;
  air_temperature: number | null;
  risk_level: string | null;
}

interface ForecastResponse {
  success: boolean;
  cityId: string;
  cityName: string;
  current: number | null;
  peak: number | null;
  mean: number | null;
  riskLevel: string;
  series: ForecastPoint[];
  source: 'fortyguard' | 'fallback';
  message?: string;
  error?: string;
  latency?: number;
}

interface ForecastPanelProps {
  cityId: string;
  cityName: string;
  currentTempF?: number | null;
}

const ForecastPanel: React.FC<ForecastPanelProps> = ({ cityId, cityName, currentTempF }) => {
  const [data, setData] = useState<ForecastResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch('/api/forecast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cityId }),
    })
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (!j?.success) {
          setError({ message: j?.error || 'Forecast unavailable' });
        } else {
          setData(j);
        }
      })
      .catch((e) => !cancelled && setError({ message: e?.message || 'Network error' }))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [cityId]);

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-5">
        <div className="skeleton-shimmer h-4 w-40 rounded mb-3" />
        <div className="grid grid-cols-3 gap-3 mb-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton-shimmer h-16 rounded-lg" />
          ))}
        </div>
        <div className="skeleton-shimmer h-24 rounded-lg" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <ErrorCard
        error={error || { message: 'No 12-hour forecast available' }}
        onRetry={() => {
          setLoading(true);
          setError(null);
          fetch('/api/forecast', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cityId }),
          })
            .then((r) => r.json())
            .then((j) => (j?.success ? setData(j) : setError({ message: j?.error })))
            .catch((e) => setError({ message: e?.message }))
            .finally(() => setLoading(false));
        }}
        title="12-Hour Forecast Unavailable"
      />
    );
  }

  const risk = getRiskLevelInfo(data.riskLevel);
  const peak = data.peak;
  const mean = data.mean;
  const validPoints = data.series.filter((p) => p.temperature != null);
  const hasData = validPoints.length > 0;

  // Chart data — one point per hour, only include real numbers
  const chartData = data.series.map((p) => ({
    hour: `+${p.hour_offset}h`,
    hourOffset: p.hour_offset,
    temp: p.temperature,
    risk: p.risk_level,
    raw: p,
  }));

  return (
    <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className="text-sm font-semibold flex items-center gap-2 text-slate-900">
          <Sparkles className="w-4 h-4 text-violet-500" />
          12-Hour Forecast
          <span className="text-[10px] font-normal text-slate-500 ml-1">— next 12 hours · {cityName}</span>
        </h3>
        <div className="flex items-center gap-2 text-[10px] text-slate-500">
          <Clock className="w-3 h-3" />
          {data.latency !== undefined && <span>{data.latency}ms</span>}
          {data.source === 'fallback' && (
            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">no live data</span>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <KPI
          label="Peak in 12 hrs"
          value={peak != null ? formatTemperature(peak) : '—'}
          sub={peak != null ? `expected at +${data.series.findIndex((p) => p.temperature === peak) + 1}h` : 'no data'}
          icon={<TrendingUp className="w-4 h-4" />}
          tone="red"
        />
        <KPI
          label="Avg Next 12 hrs"
          value={mean != null ? formatTemperature(mean) : '—'}
          sub={mean != null ? 'across all hours' : ''}
          icon={<Activity className="w-4 h-4" />}
          tone="orange"
        />
        <KPI
          label="Heat Stress Forecast"
          value={risk.label}
          sub={peak != null ? `based on ${formatTemperature(peak)} peak` : 'awaiting data'}
          icon={<AlertTriangle className="w-4 h-4" />}
          tone={risk.tone}
          highlight
        />
      </div>

      {/* Sparkline */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
        {!hasData ? (
          <div className="h-32 flex items-center justify-center text-xs text-slate-500">
            {data.message || 'FortyGuard did not return hourly forecast points. The card above is empty rather than fabricated.'}
          </div>
        ) : (
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 6, right: 8, left: -16, bottom: 0 }}>
                <XAxis
                  dataKey="hour"
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
                  interval={0}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
                  domain={['dataMin - 2', 'dataMax + 2']}
                  width={36}
                />
                <Tooltip
                  contentStyle={{
                    background: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    fontSize: 11,
                  }}
                  formatter={(v: any) => (v == null ? ['—', 'Temp'] : [`${Number(v).toFixed(1)}°F`, 'Temp'])}
                  labelFormatter={(l) => `${l} from now`}
                />
                {currentTempF != null && (
                  <ReferenceLine
                    y={currentTempF}
                    stroke="#94a3b8"
                    strokeDasharray="3 3"
                    label={{ value: 'Now', fontSize: 9, fill: '#64748b', position: 'right' }}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="temp"
                  stroke="#F97316"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#F97316', strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: '#EA580C' }}
                  isAnimationActive
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Demo script footer */}
      <div className="mt-3 text-[10px] text-slate-500 italic">
        HeatGuard doesn't just react to current heat — it predicts it. 12 hours of lead time lets planners deploy cooling resources before a spike hits.
      </div>
    </div>
  );
};

const KPI: React.FC<{
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  tone?: 'red' | 'orange' | 'amber' | 'emerald' | 'blue';
  highlight?: boolean;
}> = ({ label, value, sub, icon, tone, highlight }) => {
  const toneClasses: Record<string, string> = {
    red: 'text-red-600 bg-red-50 border-red-200',
    orange: 'text-orange-600 bg-orange-50 border-orange-200',
    amber: 'text-amber-600 bg-amber-50 border-amber-200',
    emerald: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    blue: 'text-blue-600 bg-blue-50 border-blue-200',
  };
  return (
    <div
      className={`rounded-lg border p-3 ${
        highlight ? toneClasses[tone ?? 'amber'] : 'bg-slate-50 border-slate-200'
      }`}
    >
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-500">
        <span className={highlight ? '' : 'text-slate-500'}>{icon}</span>
        {label}
      </div>
      <div className={`text-lg font-bold tabular-nums mt-1 ${highlight ? '' : 'text-slate-900'}`}>{value}</div>
      {sub && <div className="text-[10px] text-slate-500 mt-0.5">{sub}</div>}
    </div>
  );
};

export default ForecastPanel;
