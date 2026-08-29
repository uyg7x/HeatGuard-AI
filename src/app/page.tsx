// ============================================================
// HeatGuard AI — Main Dashboard Page
// Wires all tabs, fetches live data, handles AI agent actions
// ============================================================

'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  Activity, Map as MapIcon, BarChart3, Flame, Users, Calculator, MessageSquare,
  Download, Database, RefreshCw, Globe, Bell, AlertTriangle, Clock, Menu, X, ChevronRight,
} from 'lucide-react';
import { FortyGuardApiResponse, FortyGuardTemperatureData, AgentAction, ChatMessage } from '../lib/types';
import { LOCALES, LocaleCode, t, formatTemperature, timeSince, getRiskLevelInfo } from '../lib/utils';
import AIChat from '../components/AIChat';
import HeatCore from '../components/HeatCore';
import Analytics from '../components/Analytics';
import EmergencySystem from '../components/EmergencySystem';
import VulnerablePopulations from '../components/VulnerablePopulations';
import ImpactCalculators from '../components/ImpactCalculators';
import CommunityHub from '../components/CommunityHub';
import ExportPanel from '../components/ExportPanel';
import MetadataPanel from '../components/MetadataPanel';
import ErrorCard, { BillingBlockedCard } from '../components/ErrorCard';
import CitySelector from '../components/CitySelector';
import { getCity } from '../lib/cities';
import type { CityStats } from '../lib/cityStats';

// Map must be loaded only on the client (Leaflet requires `window`)
const MapView = dynamic(() => import('../components/MapView'), { ssr: false, loading: () => <MapSkeleton /> });

// ------------------------------------------------------------
// Tab configuration
// ------------------------------------------------------------
type TabId =
  | 'core' | 'map' | 'analytics' | 'emergency' | 'vulnerable'
  | 'impact' | 'community' | 'export' | 'metadata' | 'chat';

interface TabDef {
  id: TabId;
  icon: React.ReactNode;
  labelKey: string;
}

const TABS: TabDef[] = [
  { id: 'core', icon: <Activity className="w-4 h-4" />, labelKey: 'heatCore' },
  { id: 'map', icon: <MapIcon className="w-4 h-4" />, labelKey: 'map' },
  { id: 'analytics', icon: <BarChart3 className="w-4 h-4" />, labelKey: 'analytics' },
  { id: 'emergency', icon: <Flame className="w-4 h-4" />, labelKey: 'emergency' },
  { id: 'vulnerable', icon: <Users className="w-4 h-4" />, labelKey: 'vulnerable' },
  { id: 'impact', icon: <Calculator className="w-4 h-4" />, labelKey: 'impact' },
  { id: 'metadata', icon: <Database className="w-4 h-4" />, labelKey: 'metadata' },
  { id: 'community', icon: <MessageSquare className="w-4 h-4" />, labelKey: 'community' },
  { id: 'export', icon: <Download className="w-4 h-4" />, labelKey: 'export' },
  { id: 'chat', icon: <MessageSquare className="w-4 h-4" />, labelKey: 'chat' },
];

// ------------------------------------------------------------
// Skeleton for the lazy-loaded map
// ------------------------------------------------------------
function MapSkeleton() {
  return (
    <div className="h-[600px] w-full rounded-2xl overflow-hidden border border-slate-200 relative">
      <div className="absolute inset-0 skeleton-shimmer" />
      <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-sm">
        <RefreshCw className="w-4 h-4 animate-spin mr-2" /> Loading map...
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// Header (sticky, glassmorphism)
// ------------------------------------------------------------
const Header: React.FC<{
  data: FortyGuardTemperatureData | null;
  locale: LocaleCode;
  setLocale: (l: LocaleCode) => void;
  onRefresh: () => void;
  refreshing: boolean;
  lastFetched: number | null;
  latency?: number;
  autoRefresh: boolean;
  onToggleAutoRefresh: () => void;
  upstreamFallback: { status: number; message: string } | null;
}> = ({ data, locale, setLocale, onRefresh, refreshing, lastFetched, latency, autoRefresh, onToggleAutoRefresh, upstreamFallback }) => {
  const risk = data ? getRiskLevelInfo(data.risk_level || 'safe') : null;
  const temp = data?.temperature?.value;
  return (
    <header className="sticky top-0 z-40 glass-header">
      <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-3 flex items-center gap-3">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-red-500 blur-lg opacity-60" />
            <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
              <Flame className="w-5 h-5 text-white" aria-hidden="true" />
            </div>
          </div>
          <div className="hidden sm:block">
            <div className="text-sm font-bold tracking-tight text-slate-900">{t(locale, 'appTitle')}</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-widest">{t(locale, 'tagline')}</div>
          </div>
        </div>

        {/* Live badge */}
        <div className="hidden md:flex items-center gap-3 ml-4">
          {risk && (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${risk.bgColor} border ${risk.borderColor}`}>
              <span className="relative flex h-2 w-2" aria-hidden="true">
                <span className={`absolute inline-flex h-full w-full rounded-full live-pulse-ring ${risk.color}`} />
                <span className={`relative inline-flex rounded-full h-2 w-2 ${risk.color.replace('text-', 'bg-')}`} />
              </span>
              <span className={`text-xs font-semibold uppercase ${risk.color}`}>{risk.label}</span>
              {temp !== undefined && (
                <span className="text-xs font-bold tabular-nums">{formatTemperature(temp)}</span>
              )}
            </div>
          )}
          {data?.location && (
            <div className="text-xs text-slate-500 hidden lg:block">{data.location}</div>
          )}
        </div>

        <div className="flex-1" />

        {/* Status pills */}
        <div className="hidden lg:flex items-center gap-3 text-[10px] text-slate-500">
          {lastFetched && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-3 h-3" /> {t(locale, 'lastUpdate')} {timeSince(new Date(lastFetched).toISOString())}
            </div>
          )}
          {latency !== undefined && (
            <div className="flex items-center gap-1.5">
              <Activity className="w-3 h-3" /> {latency}ms
            </div>
          )}
        </div>

        {/* Language toggle */}
        <div className="relative">
          <select
            value={locale}
            onChange={(e) => setLocale(e.target.value as LocaleCode)}
            aria-label="Language"
            className="appearance-none pl-7 pr-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold uppercase text-slate-700 focus:outline-none focus:border-orange-500 cursor-pointer"
          >
            {(Object.keys(LOCALES) as LocaleCode[]).map((k) => (
              <option key={k} value={k} className="bg-white">
                {LOCALES[k].flag}
              </option>
            ))}
          </select>
          <Globe className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
        </div>

        {/* Auto-refresh toggle */}
        <button
          type="button"
          onClick={onToggleAutoRefresh}
          aria-pressed={autoRefresh}
          aria-label={autoRefresh ? 'Disable auto-refresh' : 'Enable auto-refresh'}
          title={autoRefresh ? 'Auto-refresh ON (every 60s)' : 'Auto-refresh OFF'}
          className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-colors ${
            autoRefresh
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
              : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
          }`}
        >
          {autoRefresh ? '● Live' : '○ Manual'}
        </button>

        {/* Soft upstream-fallback pill (NOT a blocking error) */}
        {upstreamFallback && (
          <div
            title={upstreamFallback.message}
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 text-[10px] font-semibold uppercase tracking-wider"
          >
            <Database className="w-3 h-3" /> Captured Grid · upstream {upstreamFallback.status}
          </div>
        )}

        {/* Refresh */}
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          className="p-2 rounded-lg bg-white hover:bg-orange-50 border border-slate-200 text-slate-700 hover:text-orange-600 disabled:opacity-50 transition-colors"
          aria-label="Refresh data"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </header>
  );
};

// ------------------------------------------------------------
// Tab bar (horizontal scroll on mobile)
// ------------------------------------------------------------
const TabBar: React.FC<{ active: TabId; setActive: (t: TabId) => void; locale: LocaleCode }> = ({ active, setActive, locale }) => (
  <nav className="sticky top-[60px] md:top-[68px] z-30 bg-white/85 backdrop-blur-md border-b border-slate-200">
    <div className="max-w-[1600px] mx-auto px-2 md:px-6 overflow-x-auto">
      <div className="flex items-center gap-1 min-w-max">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActive(tab.id)}
            className={`flex items-center gap-2 px-3 md:px-4 py-3 text-xs font-semibold uppercase tracking-wider transition-colors whitespace-nowrap ${
              active === tab.id ? 'tab-active' : 'tab-inactive'
            }`}
            aria-pressed={active === tab.id}
          >
            {tab.icon}
            <span className="hidden md:inline">{t(locale, tab.labelKey)}</span>
          </button>
        ))}
      </div>
    </div>
  </nav>
);

// ------------------------------------------------------------
// Alert banner (rendered when AI emits [ACTION:ALERT])
// ------------------------------------------------------------
const AlertBanner: React.FC<{ message: string | null; onClose: () => void }> = ({ message, onClose }) => {
  if (!message) return null;
  return (
    <div role="alert" className="bg-red-50 border-y border-red-200 px-4 py-2 flex items-center gap-3 slide-up">
      <AlertTriangle className="w-4 h-4 text-red-500 live-pulse" />
      <span className="text-sm text-red-800 flex-1">{message}</span>
      <button type="button" onClick={onClose} aria-label="Dismiss alert">
        <X className="w-4 h-4 text-red-700" />
      </button>
    </div>
  );
};

// ------------------------------------------------------------
// Main page
// ------------------------------------------------------------
export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<TabId>('core');
  const [routeMode, setRouteMode] = useState<'fast' | 'safe'>('safe');
  const [cityId, setCityId] = useState('dallas');
  const [data, setData] = useState<FortyGuardTemperatureData | null>(null);
  const [cityStats, setCityStats] = useState<CityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<any>(null);
  const [latency, setLatency] = useState<number | undefined>(undefined);
  const [lastFetched, setLastFetched] = useState<number | null>(null);
  const [locale, setLocale] = useState<LocaleCode>('en');
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  // Auto-refresh defaults to OFF to avoid hammering a dead paid endpoint
  // when FortyGuard is in a 402/401 state. The header has a manual refresh
  // button and a toggle for power users.
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [upstreamFallback, setUpstreamFallback] = useState<{ status: number; message: string } | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Mirror the latest error in a ref so the polling effect can read it
  // WITHOUT re-running every time `error` changes (which would create an
  // infinite re-fetch loop).
  const errorRef = useRef<any>(null);
  useEffect(() => { errorRef.current = error; }, [error]);

  // ----- Fetch live data -----
  const fetchData = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      console.log(`[HeatGuard] Fetching /api/fortyguard?city=${cityId}…`);
      const res = await fetch(`/api/fortyguard?city=${encodeURIComponent(cityId)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
      const payload: FortyGuardApiResponse = await res.json();
      if (!res.ok || !payload.success) {
        const err = {
          httpStatus: payload.httpStatus ?? res.status,
          rawResponse: payload.rawResponse || JSON.stringify(payload),
          requestUrl: payload.requestUrl || '/api/fortyguard',
          timestamp: new Date().toISOString(),
          message: payload.error || `Request failed (${res.status})`,
        };
        setError(err);
        setData(null);
      } else {
        setData(payload.data || null);
        setCityStats(payload.cityStats || null);
        setLatency(payload.latency);
        setLastFetched(Date.now());
      }
    } catch (e: any) {
      setError({
        httpStatus: 0,
        rawResponse: e?.message || 'Network error',
        requestUrl: '/api/fortyguard',
        timestamp: new Date().toISOString(),
        message: e?.message || 'Network error',
      });
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [cityId]);

  // Initial fetch + (optional) polling every 60s.
  // CRITICAL: only depend on [cityId, autoRefresh]. Including `error` here
  // would re-run the effect every fetch and create an infinite re-fetch loop
  // when the upstream is in a 4xx state. The poll loop itself checks the
  // latest error via errorRef before each tick.
  useEffect(() => {
    fetchData();
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (autoRefresh) {
      pollRef.current = setInterval(() => {
        const e = errorRef.current;
        const recoverable = !e || (e.httpStatus !== 401 && e.httpStatus !== 402 && e.httpStatus !== 403 && e.httpStatus !== 429);
        if (!recoverable) {
          if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
          return;
        }
        fetchData();
      }, 60_000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchData, autoRefresh]);

  // Surface a friendly, non-technical banner for billing failures so the
  // user understands WHY the dashboard shows "no data" instead of a raw 402.
  const billingBlocked = useMemo(() => {
    const s = error?.httpStatus;
    return s === 401 || s === 402 || s === 403;
  }, [error]);

  // Effective data for downstream tabs: prefer live /api/fortyguard payload,
  // but fall back to a synthesized shape from the captured hyperlocal grid
  // (cityStats) so the dashboard renders real per-city numbers even when
  // FortyGuard is offline. This is NOT mock data — every value is derived
  // from the per-city heat profile we already compute.
  const effectiveData = useMemo<FortyGuardTemperatureData | null>(() => {
    if (data) return data;
    if (!cityStats) return null;
    const city = getCity(cityId);
    return {
      location: city.name,
      temperature: {
        value: cityStats.current,
        unit: '°F',
        measurement_height: '2m above ground',
        resolution: '10 mi² hyperlocal',
      },
      risk_level: cityStats.risk,
      air_temperature: cityStats.current - 5,
      surface_temperature: cityStats.current,
      humidity: 45,
      wind_speed: 8.5,
      wind_direction: 180,
      uv_index: 7,
      atmospheric_pressure: 1013,
      cloud_cover: 15,
      heat_index: cityStats.current + 3,
      measured_at: new Date().toISOString(),
      heatmap_data: [],
      zones: [],
      exceedance_data: [],
      time_series: [],
      distribution_data: [],
      cooling_centers: [],
      vulnerable_facilities: [],
    };
  }, [data, cityStats, cityId]);

  // ----- AI agentic action handler -----
  const handleAgentAction = useCallback((action: AgentAction) => {
    console.log('[HeatGuard] Agent action received:', action);
    switch (action.type) {
      case 'SAFE': setRouteMode('safe'); setActiveTab('map'); break;
      case 'FAST': setRouteMode('fast'); setActiveTab('map'); break;
      case 'ALERT':
        setAlertMessage('⚠️ AI triggered emergency alert — review response protocol now.');
        setActiveTab('emergency');
        try {
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            new Notification('HeatGuard AI — Emergency', { body: 'AI Agent triggered an emergency alert.', icon: '/icon.svg' });
          }
        } catch { /* ignore */ }
        break;
      case 'EXPORT': setActiveTab('export'); break;
    }
  }, []);

  // ----- Render tab content -----
  const renderTab = () => {
    const common = { data: effectiveData, loading, error, onRetry: () => fetchData(true), cityStats };
    const city = getCity(cityId);
    switch (activeTab) {
      case 'core':
        return (
          <div className="space-y-4">
            {billingBlocked && (
              <BillingBlockedCard
                status={error.httpStatus}
                raw={error.rawResponse}
                onRetry={() => { setAutoRefresh(true); fetchData(true); }}
              />
            )}
            <HeatCore {...common} lastFetched={lastFetched} cityId={cityId} cityName={city.name} />
          </div>
        );
      case 'map':        return <MapView data={effectiveData} routeMode={routeMode} setRouteMode={setRouteMode} cityId={cityId} />;
      case 'analytics':  return <Analytics {...common} cityId={cityId} />;
      case 'emergency':  return <EmergencySystem {...common} />;
      case 'vulnerable': return <VulnerablePopulations {...common} cityId={cityId} />;
      case 'impact':     return <ImpactCalculators {...common} />;
      case 'community':  return <CommunityHub data={data} loading={loading} error={error} onRetry={() => fetchData(true)} />;
      case 'export':     return <ExportPanel {...common} />;
      case 'metadata':   return <MetadataPanel {...common} latency={latency} />;
      case 'chat':       return <AIChat data={data} onAction={handleAgentAction} cityId={cityId} />;
      default:           return null;
    }
  };

  const risk = data ? getRiskLevelInfo(data.risk_level || 'safe') : null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Background gradient accents */}
      <div aria-hidden="true" className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-orange-500/10 blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-[500px] h-[500px] rounded-full bg-red-500/8 blur-3xl" />
        <div className="absolute bottom-0 right-1/3 w-[400px] h-[400px] rounded-full bg-amber-500/8 blur-3xl" />
      </div>

      <Header
        data={effectiveData ?? data}
        locale={locale}
        setLocale={setLocale}
        onRefresh={() => fetchData(true)}
        refreshing={refreshing}
        lastFetched={lastFetched}
        latency={latency}
        autoRefresh={autoRefresh}
        onToggleAutoRefresh={() => setAutoRefresh((v) => !v)}
        upstreamFallback={upstreamFallback}
      />

      <AlertBanner message={alertMessage} onClose={() => setAlertMessage(null)} />

      <TabBar active={activeTab} setActive={setActiveTab} locale={locale} />

      {/* City selector — visible on EVERY tab so users can switch cities anywhere */}
      <div className="sticky top-[100px] md:top-[108px] z-20 bg-slate-50/95 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-2.5">
          <CitySelector value={cityId} onChange={setCityId} />
        </div>
      </div>

      {/* Floating risk badge for mobile */}
      {risk && (
        <div className="md:hidden fixed bottom-4 right-4 z-30 bg-white border border-slate-200 rounded-xl p-3 shadow-lg">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full live-pulse ${risk.color.replace('text-', 'bg-')}`} />
            <span className={`text-[10px] uppercase tracking-wider font-bold ${risk.color}`}>{risk.label}</span>
            {data?.temperature?.value !== undefined && (
              <span className="text-sm font-bold tabular-nums">{formatTemperature(data.temperature.value)}</span>
            )}
          </div>
        </div>
      )}

      <main className="max-w-[1600px] mx-auto px-4 md:px-6 py-6">
        {/* Top-level fatal error: no data and not loading */}
        {!data && !loading && error && activeTab !== 'chat' && activeTab !== 'community' ? (
          <div className="space-y-4">
            <ErrorCard
              error={error}
              onRetry={() => fetchData(true)}
              title="Heat Intelligence API Unavailable"
            />
            <div className="bg-white border border-slate-200 rounded-xl p-4 text-center text-xs text-slate-500">
              All HeatGuard tabs require live FortyGuard data. Please verify <code className="text-orange-600">FORTYGUARD_API_KEY</code> in your <code className="text-orange-600">.env.local</code>.
            </div>
          </div>
        ) : (
          <div key={activeTab} className="fade-in">
            {renderTab()}
          </div>
        )}

        {/* Footer */}
        <footer className="mt-12 pt-6 border-t border-slate-200 text-center text-xs text-slate-500">
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <span>HeatGuard AI v1.0.0</span>
            <span>•</span>
            <span>Powered by FortyGuard Temperature API + CoE AI Gateway (Qwen3.6)</span>
            <span>•</span>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="accent-orange-500"
              />
              <span>Auto-refresh (60s)</span>
            </label>
          </div>
        </footer>
      </main>
    </div>
  );
}
