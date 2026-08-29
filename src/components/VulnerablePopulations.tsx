// ============================================================
// HeatGuard AI — VulnerablePopulations Tab
// Schools, hospitals, elderly care risk mapping
// ============================================================

'use client';

import React from 'react';
import { School, Hospital, Users, Heart, MapPin, Accessibility, Shield } from 'lucide-react';
import { FortyGuardTemperatureData } from '../lib/types';
import { CITY_FACILITIES, isAtRisk, summarizeFacilities, type FacilityType, type RiskLevel } from '../lib/facilities';
import { formatTemperature } from '../lib/utils';
import ErrorCard from './ErrorCard';

interface VulnerablePopulationsProps {
  data: FortyGuardTemperatureData | null;
  loading: boolean;
  error: any;
  onRetry: () => void;
  cityId?: string;
}

const TYPE_META: Record<FacilityType, { icon: React.ReactNode; label: string; color: string }> = {
  school: { icon: <School className="w-4 h-4" />, label: 'Schools', color: 'text-blue-400' },
  hospital: { icon: <Hospital className="w-4 h-4" />, label: 'Hospitals', color: 'text-red-400' },
  elderly_care: { icon: <Heart className="w-4 h-4" />, label: 'Elderly Care', color: 'text-purple-400' },
  shelter: { icon: <Shield className="w-4 h-4" />, label: 'Shelters & Cooling Centers', color: 'text-emerald-400' },
};

const RISK_BADGE: Record<RiskLevel, { label: string; bg: string; text: string; border: string }> = {
  safe: { label: 'SAFE', bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  moderate: { label: 'CAUTION', bg: 'bg-amber-500/15', text: 'text-amber-300', border: 'border-amber-500/30' },
  high: { label: 'AT-RISK', bg: 'bg-orange-500/20', text: 'text-orange-300', border: 'border-orange-500/40' },
  extreme: { label: 'CRITICAL', bg: 'bg-red-500/25', text: 'text-red-300', border: 'border-red-500/50' },
};

const VulnerablePopulations: React.FC<VulnerablePopulationsProps> = ({ data, loading, error, onRetry, cityId = 'dallas' }) => {
  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="bg-white border border-slate-200 shadow-sm rounded-xl">
            <div className="skeleton-shimmer h-5 w-48 rounded mb-2" />
            <div className="skeleton-shimmer h-12 w-full rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (error || !data) {
    return <ErrorCard error={error || { message: 'No live temperature data — cannot assess at-risk facilities' }} onRetry={onRetry} title="Vulnerable Populations Data Unavailable" />;
  }

  // LIVE current air temperature drives the at-risk assessment
  const currentTempF: number | null =
    data?.air_temperature ?? data?.surface_temperature ?? data?.temperature?.value ?? null;

  // Per-city curated registry (falls back to Austin FACILITIES if the city
  // is not yet registered).
  const cityFacilities = CITY_FACILITIES[cityId] ?? [];
  const { total, populationServed, atRiskCount } = summarizeFacilities(currentTempF, cityFacilities);

  // Decorate each facility with derived at-risk status
  const annotated = cityFacilities.map((f) => {
    const risk = isAtRisk(f, currentTempF);
    return { ...f, risk };
  });

  const byType: Record<FacilityType, Array<typeof annotated[number]>> = {
    school: annotated.filter((f) => f.type === 'school'),
    hospital: annotated.filter((f) => f.type === 'hospital'),
    elderly_care: annotated.filter((f) => f.type === 'elderly_care'),
    shelter: annotated.filter((f) => f.type === 'shelter'),
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard icon={<Users className="w-4 h-4" />} label="Total Facilities" value={total.toString()} accent="text-blue-400" />
        <SummaryCard icon={<Heart className="w-4 h-4" />} label="Population Served" value={populationServed.toLocaleString()} accent="text-orange-400" />
        <SummaryCard icon={<Shield className="w-4 h-4" />} label="At-Risk Facilities" value={`${atRiskCount} of ${total}`} accent="text-red-400" />
        <SummaryCard icon={<Accessibility className="w-4 h-4" />} label="Current Air Temp" value={currentTempF !== null ? formatTemperature(currentTempF) : '—'} accent="text-emerald-400" />
      </div>

      {/* At-risk callout */}
      {atRiskCount > 0 && currentTempF !== null && (
        <div className="bg-white border border-red-200 shadow-sm rounded-xl p-4 flex items-start gap-3">
          <Shield className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <div className="font-semibold text-red-700">
              {atRiskCount} {atRiskCount === 1 ? 'facility' : 'facilities'} flagged at-risk at {formatTemperature(currentTempF)}
            </div>
            <div className="text-xs text-slate-600 mt-1">
              Schools and elderly-care sites use stricter thresholds per NWS heat advisory guidance.
            </div>
          </div>
        </div>
      )}

      {/* By Type */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(Object.keys(byType) as FacilityType[]).map((type) => {
          const list = byType[type];
          if (list.length === 0) return null;
          const meta = TYPE_META[type];
          const typeAtRisk = list.filter((f) => f.risk.atRisk).length;
          return (
            <div key={type} className="bg-white border border-slate-200 shadow-sm rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={meta.color}>{meta.icon}</span>
                  <h3 className="text-sm font-semibold text-slate-900">{meta.label} ({list.length})</h3>
                </div>
                {typeAtRisk > 0 && (
                  <span className="text-[10px] uppercase tracking-wider font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                    {typeAtRisk} at-risk
                  </span>
                )}
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {list.map((f) => {
                  const badge = RISK_BADGE[f.risk.level];
                  return (
                    <div key={f.id} className="p-3 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate text-slate-900">{f.name}</div>
                          <div className="text-xs text-slate-500 truncate flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {f.address}, {f.city} {f.state}
                          </div>
                          {f.notes && <div className="text-[10px] text-slate-400 mt-0.5">{f.notes}</div>}
                        </div>
                        <div className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold uppercase flex-shrink-0 ${badge.bg} ${badge.text} ${badge.border}`}>
                          {f.risk.atRisk ? 'AT-RISK' : badge.label}
                        </div>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs">
                        <span className="text-slate-600">{f.population_served.toLocaleString()} people</span>
                        <span className="text-slate-400">
                          {f.accessibility === 'wheelchair' ? '♿ Accessible' : f.accessibility === 'partial' ? '♿ Partial' : '♿ Limited'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Full list table */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-5">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-slate-900">
          <Users className="w-4 h-4 text-orange-500" /> All Facilities ({annotated.length})
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <th className="text-left py-2 pr-4">Name</th>
                <th className="text-left py-2 pr-4">Type</th>
                <th className="text-right py-2 pr-4">Population</th>
                <th className="text-right py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {annotated.map((f) => {
                const meta = TYPE_META[f.type];
                const badge = RISK_BADGE[f.risk.level];
                return (
                  <tr key={f.id} className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="py-2 pr-4">
                      <div className="font-medium text-slate-900">{f.name}</div>
                      <div className="text-[10px] text-slate-500">{f.city}, {f.state}</div>
                    </td>
                    <td className="py-2 pr-4">
                      <span className={`inline-flex items-center gap-1 ${meta.color}`}>
                        {meta.icon} <span className="text-slate-700">{meta.label}</span>
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-right tabular-nums text-slate-900">{f.population_served.toLocaleString()}</td>
                    <td className="py-2 text-right">
                      <span className={`inline-block px-2 py-0.5 rounded-full border font-bold text-[10px] uppercase ${badge.bg} ${badge.text} ${badge.border}`}>
                        {f.risk.atRisk ? 'AT-RISK' : badge.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const SummaryCard: React.FC<{ icon: React.ReactNode; label: string; value: string; accent: string }> = ({ icon, label, value, accent }) => (
  <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4">
    <div className={`flex items-center gap-2 ${accent}`}>
      {icon}
      <span className="text-[10px] uppercase tracking-wider text-slate-500">{label}</span>
    </div>
    <div className="text-xl font-bold tabular-nums mt-2 text-slate-900">{value}</div>
  </div>
);

export default VulnerablePopulations;
