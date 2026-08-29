// ============================================================
// HeatGuard AI — ExportPanel Tab
// PDF/CSV export with real data via /api/export
// ZERO MOCK DATA POLICY COMPLIANT
// ============================================================

'use client';

import React, { useState } from 'react';
import { FileText, Download, Loader2, CheckCircle2, FileSpreadsheet } from 'lucide-react';
import { FortyGuardTemperatureData } from '../lib/types';
import { formatTimestamp } from '../lib/utils';
import ErrorCard from './ErrorCard';

interface ExportPanelProps {
  data: FortyGuardTemperatureData | null;
  loading: boolean;
  error: any;
  onRetry: () => void;
}

type ExportType = 'pdf' | 'csv';

const ExportPanel: React.FC<ExportPanelProps> = ({ data, loading, error, onRetry }) => {
  const [exporting, setExporting] = useState<ExportType | null>(null);
  const [lastExport, setLastExport] = useState<{ type: ExportType; size: number; at: number } | null>(null);
  const [exportError, setExportError] = useState<any>(null);

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-6">
        <div className="skeleton-shimmer h-6 w-48 rounded mb-3" />
        <div className="skeleton-shimmer h-32 w-full rounded" />
      </div>
    );
  }

  if (error || !data) {
    return <ErrorCard error={error || { message: 'No FortyGuard temperature data available to export' }} onRetry={onRetry} title="Export Unavailable" />;
  }

  const handleExport = async (type: ExportType) => {
    setExporting(type);
    setExportError(null);
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          data,
          reportTitle: `HeatGuard AI Executive Climate Report — ${data.location || 'Metro'}`,
        }),
      });
      const payload = await res.json();
      if (!res.ok || !payload.success) {
        setExportError({
          httpStatus: res.status,
          rawResponse: JSON.stringify(payload).substring(0, 500),
          requestUrl: '/api/export',
          timestamp: new Date().toISOString(),
        });
        setExporting(null);
        return;
      }
      const blob = new Blob([payload.data], { type: type === 'csv' ? 'text/csv' : 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `heatguard-report-${type}-${Date.now()}.${type === 'csv' ? 'csv' : 'txt'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setLastExport({ type, size: blob.size, at: Date.now() });
    } catch (e: any) {
      setExportError({
        httpStatus: 0,
        rawResponse: e?.message || 'Network export error',
        requestUrl: '/api/export',
        timestamp: new Date().toISOString(),
      });
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Export Action Card */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-orange-500" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-slate-900">Generate Reports &amp; Export Data</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ExportButton
            type="pdf"
            title="Executive Report (PDF / TXT)"
            description="Comprehensive climate & policy report for city planners"
            icon={<FileText className="w-5 h-5" />}
            color="bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
            onExport={handleExport}
            exporting={exporting}
          />
          <ExportButton
            type="csv"
            title="Raw Geospatial Dataset (CSV)"
            description="Cell thermal values, micro-zone vectors & shelter locations"
            icon={<FileSpreadsheet className="w-5 h-5" />}
            color="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
            onExport={handleExport}
            exporting={exporting}
          />
        </div>

        {lastExport && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2.5 text-sm text-emerald-700 slide-up">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{lastExport.type.toUpperCase()} file generated successfully ({(lastExport.size / 1024).toFixed(1)} KB) at {formatTimestamp(new Date(lastExport.at).toISOString())}</span>
          </div>
        )}

        {exportError && (
          <div className="mt-4">
            <ErrorCard error={exportError} title="Export Failed" />
          </div>
        )}
      </div>

      {/* Dataset Summary Preview */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-6">
        <h3 className="text-sm font-semibold mb-3 text-slate-900">Live FortyGuard Dataset Preview</h3>
        <div className="space-y-2">
          <Row label="Location" value={data.location || 'Unknown'} />
          <Row label="Current Temperature" value={data.temperature?.value !== undefined ? `${data.temperature.value.toFixed(1)}°F` : '—'} />
          <Row label="Risk Assessment" value={(data.risk_level || 'safe').toUpperCase()} />
          <Row label="Measurement Time" value={formatTimestamp(data.measured_at)} />
          <Row label="Heatmap Cells" value={`${(data.heatmap_data || []).length} grid cells`} />
          <Row label="Zones Modeled" value={`${(data.zones || []).length} micro-zones`} />
          <Row label="Time Series Readings" value={`${(data.time_series || []).length} timestamps`} />
          <Row label="Cooling Shelters" value={`${(data.cooling_centers || []).length} locations`} />
        </div>
      </div>
    </div>
  );
};

const ExportButton: React.FC<{
  type: ExportType;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  onExport: (t: ExportType) => void;
  exporting: ExportType | null;
}> = ({ type, title, description, icon, color, onExport, exporting }) => (
  <button
    type="button"
    onClick={() => onExport(type)}
    disabled={exporting !== null}
    className={`p-4 rounded-xl text-left transition-all ${color} disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-lg`}
  >
    <div className="flex items-center gap-3">
      {exporting === type ? <Loader2 className="w-5 h-5 animate-spin" /> : icon}
      <div className="flex-1">
        <div className="font-semibold text-sm">{title}</div>
        <div className="text-xs opacity-80 mt-0.5">{description}</div>
      </div>
      <Download className="w-4 h-4 opacity-70" />
    </div>
  </button>
);

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-900">
    <span className="text-slate-500">{label}</span>
    <span className="font-semibold tabular-nums">{value}</span>
  </div>
);

export default ExportPanel;
