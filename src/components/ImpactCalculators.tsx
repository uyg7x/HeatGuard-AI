// ============================================================
// HeatGuard AI — ImpactCalculators Tab
// Carbon, Economic, Health impact dashboards
// STRICT ZERO MOCK DATA POLICY COMPLIANT
// ============================================================

'use client';

import React from 'react';
import { Leaf, DollarSign, Heart, TrendingDown, Lightbulb, AlertCircle } from 'lucide-react';
import { FortyGuardTemperatureData } from '../lib/types';
import ErrorCard from './ErrorCard';
import InterventionSimulator from './InterventionSimulator';

interface ImpactCalculatorsProps {
  data: FortyGuardTemperatureData | null;
  loading: boolean;
  error: any;
  onRetry: () => void;
}

const ImpactCalculators: React.FC<ImpactCalculatorsProps> = ({ data, loading, error, onRetry }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="bg-white border border-slate-200 shadow-sm rounded-xl p-5">
            <div className="skeleton-shimmer h-4 w-32 rounded mb-3" />
            <div className="skeleton-shimmer h-20 w-full rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (error || !data) {
    return <ErrorCard error={error || { message: 'No impact data' }} onRetry={onRetry} title="Impact Calculators Unavailable" />;
  }

  const econ = (data as any).economic_impact as
    | { productivity_loss_estimate?: number; healthcare_cost_projection?: number; energy_cost_increase?: number; total_economic_impact?: number; ac_usage_estimate?: number; co2_emissions_estimate?: number }
    | undefined;

  const health = (data as any).health_impact as
    | { predicted_illness_rate?: number; vulnerable_populations_at_risk?: number; healthcare_capacity?: string; prevention_recommendations?: string[]; heat_stress_index?: number }
    | undefined;

  const fmtCurrency = (n?: number) => n !== undefined ? (n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `$${(n / 1000).toFixed(0)}K` : `$${n.toFixed(0)}`) : '—';
  const fmtTons = (n?: number) => n !== undefined ? (n >= 1000 ? `${(n / 1000).toFixed(1)}K tons` : `${n.toFixed(0)} tons`) : '—';

  const carbonEstimate = econ?.co2_emissions_estimate;
  const econImpact = econ?.total_economic_impact;
  const productivity = econ?.productivity_loss_estimate;
  const healthcare = econ?.healthcare_cost_projection;
  const energy = econ?.energy_cost_increase;
  const illnessRate = health?.predicted_illness_rate;
  const atRisk = health?.vulnerable_populations_at_risk;

  const hasImpactData = carbonEstimate !== undefined || econImpact !== undefined || illnessRate !== undefined;

  return (
    <div className="space-y-4">
      {!hasImpactData && (
        <div className="bg-white border border-amber-200 bg-amber-50 text-amber-700 text-xs flex items-center gap-2 rounded-xl shadow-sm p-4">
          <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <span>Note: Detailed economic, health, and carbon impact metrics were not included in this FortyGuard API payload response.</span>
        </div>
      )}

      {/* Three pillars */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Carbon */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200">
              <Leaf className="w-5 h-5 text-emerald-600" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Carbon Footprint</h3>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">CO₂ from AC usage</div>
            </div>
          </div>
          <div className="text-4xl font-bold tabular-nums text-emerald-600">{fmtTons(carbonEstimate)}</div>
          <div className="text-xs text-slate-500 mt-1">per day (API metric)</div>

          <div className="mt-4">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1.5 font-semibold">Mitigation Guidelines</div>
            <ul className="space-y-1.5 text-xs text-slate-700">
              <li className="flex items-start gap-1.5"><Lightbulb className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" /> Set thermostat baseline to 78°F minimum</li>
              <li className="flex items-start gap-1.5"><Lightbulb className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" /> Utilize programmable grid load controls</li>
              <li className="flex items-start gap-1.5"><Lightbulb className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" /> Expand urban tree canopy &amp; cool pavements</li>
            </ul>
          </div>
        </div>

        {/* Economic */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-lg bg-amber-50 border border-amber-200">
              <DollarSign className="w-5 h-5 text-amber-600" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Economic Impact</h3>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">Daily city-wide cost</div>
            </div>
          </div>
          <div className="text-4xl font-bold tabular-nums text-amber-600">{fmtCurrency(econImpact)}</div>
          <div className="text-xs text-slate-500 mt-1">total estimated loss</div>
          <div className="mt-4 space-y-2">
            <Breakdown label="Productivity Loss" value={fmtCurrency(productivity)} pct={productivity && econImpact ? (productivity / econImpact) * 100 : 0} color="bg-red-500" />
            <Breakdown label="Healthcare Costs" value={fmtCurrency(healthcare)} pct={healthcare && econImpact ? (healthcare / econImpact) * 100 : 0} color="bg-orange-500" />
            <Breakdown label="Energy Increase" value={fmtCurrency(energy)} pct={energy && econImpact ? (energy / econImpact) * 100 : 0} color="bg-amber-500" />
          </div>
        </div>

        {/* Health */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-lg bg-red-50 border border-red-200">
              <Heart className="w-5 h-5 text-red-600" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Health Impact</h3>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">Predicted illness rates</div>
            </div>
          </div>
          <div className="text-4xl font-bold tabular-nums text-red-600">{illnessRate !== undefined ? illnessRate.toFixed(1) : '—'}</div>
          <div className="text-xs text-slate-500 mt-1">cases per 10,000 residents</div>
          {atRisk !== undefined && (
            <div className="mt-3 p-2 rounded bg-red-50 border border-red-200">
              <div className="flex items-center gap-2 text-xs text-red-700">
                <AlertCircle className="w-3.5 h-3.5" /> {atRisk.toLocaleString()} vulnerable residents at risk
              </div>
            </div>
          )}
          <div className="mt-4">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1.5 font-semibold">Prevention Protocol</div>
            <ul className="space-y-1.5 text-xs text-slate-700">
              <li className="flex items-start gap-1.5"><Lightbulb className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" /> Stay hydrated (8+ glasses/day)</li>
              <li className="flex items-start gap-1.5"><Lightbulb className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" /> Avoid peak afternoon sun exposure (11am-3pm)</li>
              <li className="flex items-start gap-1.5"><Lightbulb className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" /> Wear loose, breathable clothing</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Infrastructure Stress */}
      {(data as any).infrastructure_stress && (
        <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-3 text-slate-900">Infrastructure Stress Indicators</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <StressBar label="Power Grid Load" value={(data as any).infrastructure_stress.power_grid_load ?? 0} max={100} unit="%" />
            <StressBar label="Water System Stress" value={(data as any).infrastructure_stress.water_system_stress ?? 0} max={100} unit="%" />
            <StressBar label="Peak Demand" value={(data as any).infrastructure_stress.peak_demand_prediction ?? 0} max={100} unit="%" />
          </div>
        </div>
      )}

      {/* Cooling Intervention Simulator (ROI) - always render last */}
      <InterventionSimulator 
        cityName={data.location ?? 'Unknown City'} 
        baselineF={data.temperature?.value ?? 0} 
      />
    </div>
  );
};

const Breakdown: React.FC<{ label: string; value: string; pct: number; color: string }> = ({ label, value, pct, color }) => (
  <div>
    <div className="flex items-center justify-between text-xs mb-1">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-slate-900">{value}</span>
    </div>
    <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
      <div className={`h-full ${color}`} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
    </div>
  </div>
);

const StressBar: React.FC<{ label: string; value: number; max: number; unit: string }> = ({ label, value, max, unit }) => {
  const pct = Math.min(100, (value / max) * 100);
  const color = pct > 75 ? 'bg-red-500' : pct > 50 ? 'bg-orange-500' : 'bg-emerald-500';
  return (
    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
      <div className="flex items-center justify-between text-xs mb-2">
        <span className="text-slate-500">{label}</span>
        <span className="font-semibold text-slate-900">{value.toFixed(0)}{unit}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

export default ImpactCalculators;
