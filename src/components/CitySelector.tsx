// ============================================================
// HeatGuard AI — CitySelector
// Horizontal pill row. Selected city = orange fill + shadow.
// Inactive pills use the glassmorphism white/10 styling.
// ============================================================

'use client';

import React from 'react';
import { CITIES } from '@/lib/cities';

interface CitySelectorProps {
  value: string;
  onChange: (id: string) => void;
}

export default function CitySelector({ value, onChange }: CitySelectorProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Select city"
      className="flex gap-2 flex-wrap"
    >
      {CITIES.map((c) => {
        const active = value === c.id;
        return (
          <button
            key={c.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(c.id)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              active
                ? 'bg-orange-500 text-white shadow-md border border-orange-500'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {c.name}
          </button>
        );
      })}
    </div>
  );
}
