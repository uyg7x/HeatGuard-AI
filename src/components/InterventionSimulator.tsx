// ============================================================
// HeatGuard AI — Cooling Intervention Simulator (ROI)
// ============================================================

'use client';

import React, { useState } from 'react';

interface InterventionSimulatorProps {
  cityName: string;
  baselineF: number;
}

const InterventionSimulator: React.FC<InterventionSimulatorProps> = ({ cityName, baselineF }) => {
  // Slider state with defaults
  const [canopy, setCanopy] = useState(20);
  const [roofs, setRoofs] = useState(50);
  const [pavement, setPavement] = useState(40);

  // UHI planning coefficients (°F at 100% coverage)
  const CANOPY_COEFF = 5.0;
  const ROOFS_COEFF = 1.8;
  const PAVEMENT_COEFF = 1.2;

  // Derived cooling calculations
  const canopyCooling = (canopy / 100) * CANOPY_COEFF;
  const roofsCooling = (roofs / 100) * ROOFS_COEFF;
  const pavementCooling = (pavement / 100) * PAVEMENT_COEFF;

  const cooling = canopyCooling + roofsCooling + pavementCooling;
  const newTemp = baselineF - cooling;

  // ROI calculations
  const energySavings = cooling * 0.85; // $M per year
  const erVisitsAvoided = Math.round(cooling * 38);
  const productivityGain = cooling * 0.4; // % outdoor labor hours

  return (
    <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-orange-50 border border-orange-200">
          <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Cooling Intervention Simulator</h3>
          <div className="text-[10px] text-slate-500 uppercase tracking-wider">ROI &amp; UHI Mitigation Planning</div>
        </div>
      </div>

      {/* Three Sliders */}
      <div className="space-y-4 border-t border-slate-200 pt-4">
        {/* Tree Canopy */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <label htmlFor="canopy" className="text-slate-500 font-medium">Tree canopy +{canopy}%</label>
            <span className="text-emerald-600 font-semibold tabular-nums">-{canopyCooling.toFixed(2)}°F</span>
          </div>
          <input
            id="canopy"
            type="range"
            min="0"
            max="100"
            value={canopy}
            onChange={(e) => setCanopy(Number(e.target.value))}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            aria-label="Tree canopy percentage"
          />
        </div>

        {/* Cool Roofs */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <label htmlFor="roofs" className="text-slate-500 font-medium">Cool roofs {roofs}%</label>
            <span className="text-violet-600 font-semibold tabular-nums">-{roofsCooling.toFixed(2)}°F</span>
          </div>
          <input
            id="roofs"
            type="range"
            min="0"
            max="100"
            value={roofs}
            onChange={(e) => setRoofs(Number(e.target.value))}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-violet-500"
            aria-label="Cool roofs percentage"
          />
        </div>

        {/* Cool Pavement */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <label htmlFor="pavement" className="text-slate-500 font-medium">Cool pavement {pavement}%</label>
            <span className="text-orange-600 font-semibold tabular-nums">-{pavementCooling.toFixed(2)}°F</span>
          </div>
          <input
            id="pavement"
            type="range"
            min="0"
            max="100"
            value={pavement}
            onChange={(e) => setPavement(Number(e.target.value))}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-orange-400"
            aria-label="Cool pavement percentage"
          />
        </div>
      </div>

      {/* KPI Row - 3 Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 border-t border-slate-200 pt-4">
        {/* Baseline */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-4">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">BASELINE (FortyGuard measured)</div>
          <div className="text-2xl font-bold tabular-nums text-red-600">{baselineF.toFixed(1)}°F</div>
        </div>

        {/* Projected Cooling */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-4">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">PROJECTED COOLING</div>
          <div className="text-2xl font-bold tabular-nums text-emerald-600">-{cooling.toFixed(2)}°F</div>
        </div>

        {/* New Temperature */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-4">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">NEW TEMPERATURE</div>
          <div className="text-2xl font-bold tabular-nums text-slate-900">{newTemp.toFixed(1)}°F</div>
        </div>
      </div>

      {/* Where the cooling comes from - Progress Bars */}
      <div className="space-y-3 border-t border-slate-200 pt-4">
        <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Where the cooling comes from</div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-slate-500">Tree canopy</span>
            <span className="font-semibold text-emerald-600 tabular-nums">-{canopyCooling.toFixed(2)}°F</span>
          </div>
          <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(canopyCooling / Math.max(cooling, 0.001)) * 100}%` }} />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-slate-500">Cool roofs</span>
            <span className="font-semibold text-violet-600 tabular-nums">-{roofsCooling.toFixed(2)}°F</span>
          </div>
          <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
            <div className="h-full bg-violet-500 rounded-full" style={{ width: `${(roofsCooling / Math.max(cooling, 0.001)) * 100}%` }} />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-slate-500">Cool pavement</span>
            <span className="font-semibold text-orange-600 tabular-nums">-{pavementCooling.toFixed(2)}°F</span>
          </div>
          <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
            <div className="h-full bg-orange-400 rounded-full" style={{ width: `${(pavementCooling / Math.max(cooling, 0.001)) * 100}%` }} />
          </div>
        </div>
      </div>

      {/* ROI Row - 3 Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 border-t border-slate-200 pt-4">
        {/* Energy Savings */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-4">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Energy savings / yr</div>
          <div className="text-xl font-bold tabular-nums text-emerald-600">${energySavings.toFixed(1)}M</div>
          <div className="text-[10px] text-slate-400 mt-0.5">≈ city-scale AC savings</div>
        </div>

        {/* ER Visits Avoided */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-4">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">ER visits avoided / yr</div>
          <div className="text-xl font-bold tabular-nums text-violet-600">{erVisitsAvoided.toLocaleString()}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Heat-related emergencies</div>
        </div>

        {/* Productivity Gain */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-lg p-4">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Productivity gain</div>
          <div className="text-xl font-bold tabular-nums text-orange-600">+{productivityGain.toFixed(1)}%</div>
          <div className="text-[10px] text-slate-400 mt-0.5">outdoor labor hours</div>
        </div>
      </div>

      {/* Footnote */}
      <p className="text-xs text-slate-400 text-center border-t border-slate-200 pt-3">
        Planning estimates from published UHI-mitigation literature &bull; Baseline = live FortyGuard measurement for {cityName}.
      </p>
    </div>
  );
};

export default InterventionSimulator;