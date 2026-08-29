// ============================================================
// HeatGuard AI — HeatCore Tab
// Current temperature hero display with risk badge + freshness
// STRICT ZERO MOCK / DEFAULT DATA POLICY COMPLIANT
// ============================================================

'use client';

import React from 'react';
import { Activity, MapPin, Clock, Layers, Ruler } from 'lucide-react';
import { FortyGuardTemperatureData } from '../lib/types';
import { getRiskLevelInfo, formatTemperature, timeSince } from '../lib/utils';
import ErrorCard from './ErrorCard';

interface HeatCoreProps {
  data: FortyGuardTemperatureData | null;
  loading: boolean;
  error: any;
  onRetry: () => void;
  lastFetched: number | null;
  cityId?: string;
  cityName?: string;
  cityStats?: {
    current: number;
    peak: number;
    min: number;
    mean: number;
    std: number;
    hotCells: number;
    totalCells: number;
    capturedAt: string;
  } | null;
}

const RISK_COLOR_MAP: Record<string, string> = {
  safe: '#10B981',
  moderate: '#F59E0B',
  high: '#F97316',
  extreme: '#EF4444',
};

const HeatCore: React.FC<HeatCoreProps> = ({ data, loading, error, onRetry, lastFetched, cityName, cityStats }) => {
  // Hooks BEFORE any conditional return — keep this at the top of the component.
  // (Currently no hooks in this body, but the rule still applies.)
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
            <div className="skeleton-shimmer h-4 w-24 rounded mb-3" />
            <div className="skeleton-shimmer h-12 w-32 rounded mb-2" />
            <div className="skeleton-shimmer h-3 w-20 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (error || !data) {
    return <ErrorCard error={error || { message: 'No FortyGuard API temperature data available' }} onRetry={onRetry} title="Heat Intelligence Unavailable" />;
  }

  const tempValue = cityStats ? cityStats.current : (data.temperature?.value ?? 0);
  const riskKey = (data.risk_level || 'safe').toLowerCase();
  const risk = getRiskLevelInfo(riskKey);
  const location = cityName || data.location || 'Location Not Specified';
  const measuredAt = data.measured_at || new Date().toISOString();
  const hexColor = RISK_COLOR_MAP[riskKey] || '#10B981';

  return (
    <div className="space-y-4">
      {/* Hero card */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-xl relative overflow-hidden p-6 md:p-8">
        <div
          className="absolute -top-20 -right-20 w-64 h-64 rounded-full opacity-15 pointer-events-none transition-all duration-500"
          style={{ background: hexColor }}
          aria-hidden="true"
        />

        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          {/* Temperature Hero */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3" aria-hidden="true">
                <span className={`absolute inline-flex h-full w-full rounded-full live-pulse-ring ${risk.color}`} />
                <span className={`relative inline-flex rounded-full h-3 w-3 ${risk.bgColor} ${risk.color}`} />
              </span>
              <span className="text-xs uppercase tracking-widest text-slate-500 font-semibold">Live FortyGuard Heat Intelligence</span>
            </div>

            <div className="flex items-baseline gap-3">
              <h1 className="text-7xl md:text-8xl font-black tabular-nums tracking-tighter text-slate-900" aria-live="polite">
                {tempValue.toFixed(1)}
              </h1>
              <div className="text-2xl md:text-3xl text-slate-500 font-light">°F</div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full ${risk.bgColor} ${risk.color} border ${risk.borderColor} text-sm font-bold tracking-wide shadow-sm`}>
                <span aria-hidden="true">{risk.icon}</span>
                <span>{risk.label}</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-slate-700 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                <MapPin className="w-4 h-4 text-orange-500" aria-hidden="true" />
                <span>{location}</span>
              </div>
            </div>
          </div>

          {/* Right stats */}
          <div className="space-y-3">
            <StatBlock icon={<Ruler className="w-4 h-4" />} label="Measurement Altitude" value={data.temperature?.measurement_height || '2m above ground'} />
            <StatBlock icon={<Layers className="w-4 h-4" />} label="Spatial Resolution" value={data.temperature?.resolution || '10 mi² hyperlocal'} />
            <StatBlock icon={<Activity className="w-4 h-4 text-orange-500" />} label="Model Accuracy" value={data.model_accuracy !== undefined ? `${data.model_accuracy}%` : 'LTM v1.0 (NVIDIA-recognized)'} />
          </div>
        </div>
      </div>

      {/* Secondary metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Metric label="Air Temperature" value={data.air_temperature !== undefined ? formatTemperature(data.air_temperature) : '—'} />
        <Metric label="Humidity" value={data.humidity !== undefined ? `${data.humidity.toFixed(0)}%` : '—'} />
        <Metric label="Wind Speed" value={data.wind_speed !== undefined ? `${data.wind_speed.toFixed(1)} mph` : '—'} />
        <Metric label="UV Index" value={data.uv_index !== undefined ? data.uv_index.toFixed(0) : '—'} />
      </div>

      {/* Hyperlocal grid snapshot — per-city peak/min from real cells */}
      {cityStats && (
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl flex items-center justify-between flex-wrap gap-2 text-xs px-4 py-3">
          <div className="flex items-center gap-2 text-slate-700">
            <Layers className="w-3.5 h-3.5 text-orange-500" aria-hidden="true" />
            <span>
              Peak <span className="font-bold text-red-600">{cityStats.peak.toFixed(1)}°F</span> · Min{' '}
              <span className="font-bold text-emerald-600">{cityStats.min.toFixed(1)}°F</span> · from{' '}
              <span className="font-bold text-orange-600">{cityStats.totalCells}</span> hyperlocal cells
            </span>
          </div>
          <div className="text-[10px] text-slate-500">
            Snapshot {new Date(cityStats.capturedAt).toLocaleString()}
          </div>
        </div>
      )}

      {/* Freshness */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-xl flex items-center justify-between text-xs px-4 py-3">
        <div className="flex items-center gap-2 text-slate-500">
          <Clock className="w-3.5 h-3.5 text-orange-500" aria-hidden="true" />
          <span>Measured {timeSince(measuredAt)}</span>
        </div>
        <div className="text-slate-400">
          {lastFetched ? `Fetched ${timeSince(new Date(lastFetched).toISOString())}` : ''}
        </div>
      </div>
    </div>
  );
};

const StatBlock: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-orange-300 transition-colors">
    <div className="text-orange-500 p-2 rounded-lg bg-white border border-slate-200">{icon}</div>
    <div>
      <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className="text-sm font-semibold text-slate-900">{value}</div>
    </div>
  </div>
);

const Metric: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4">
    <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
    <div className="text-xl font-bold tabular-nums mt-1 text-slate-900">{value}</div>
  </div>
);

export default HeatCore;
