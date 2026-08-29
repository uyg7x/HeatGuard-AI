// ============================================================
// HeatGuard AI — ErrorCard Component
// Renders detailed API failure info (no silent fallbacks)
// ============================================================

'use client';

import React from 'react';
import { AlertTriangle, Copy, RotateCw, RefreshCw } from 'lucide-react';
import { ApiError } from '../lib/types';

interface ErrorCardProps {
  error: ApiError | { httpStatus?: number; rawResponse?: string; requestUrl?: string; timestamp?: string; message?: string };
  onRetry?: () => void;
  title?: string;
}

const ErrorCard: React.FC<ErrorCardProps> = ({ error, onRetry, title = 'API Request Failed' }) => {
  const httpStatus = error.httpStatus ?? 0;
  const rawResponse = error.rawResponse || error.message || 'No response body received.';
  const requestUrl = error.requestUrl || 'N/A';
  const timestamp = error.timestamp || new Date().toISOString();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify({ httpStatus, requestUrl, rawResponse, timestamp }, null, 2));
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div role="alert" aria-live="assertive" className="error-card">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <h3 className="text-red-700 font-semibold text-sm">{title}</h3>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600"
            aria-label="Copy error details"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="hidden">
        <div>
          <span className="text-slate-500 uppercase tracking-wide text-[10px]">Request URL</span>
          <div className="text-slate-800 font-mono break-all mt-0.5">{requestUrl}</div>
        </div>
        <div>
          <span className="text-slate-500 uppercase tracking-wide text-[10px]">Raw Response (first 500 chars)</span>
          <pre className="mt-1 max-h-40 overflow-auto">{rawResponse.substring(0, 500)}</pre>
        </div>
      </div>
    </div>
  );
};

// Special billing-failure card: explains the 401/402 in plain English.
export const BillingBlockedCard: React.FC<{ status: number; raw?: string; onRetry: () => void }> = ({ status, raw, onRetry }) => {
  const reason =
    status === 401 ? 'Invalid or unknown API key.' :
    status === 402 ? 'FortyGuard plan has no remaining credits / heatmap endpoint not included in tier.' :
    status === 403 ? 'Forbidden — your API key is not authorized for this endpoint.' :
    `Upstream returned ${status}.`;
  return (
    <div role="alert" className="rounded-2xl border border-amber-300 bg-amber-50 p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <div className="text-sm font-bold text-amber-900">
            Live FortyGuard feed paused — HTTP {status}
          </div>
          <div className="text-xs text-amber-800 mt-1">
            {reason} The dashboard is now serving cached per-city data (no mocks)
            from the last successful capture. Auto-refresh is disabled until the
            upstream recovers. <strong>No re-polls every 60s.</strong>
          </div>
          {raw && (
            <pre className="mt-3 max-h-32 overflow-auto text-[10px] text-amber-900/80 bg-amber-100/60 border border-amber-200 rounded p-2 whitespace-pre-wrap break-words">
{raw.substring(0, 500)}
            </pre>
          )}
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-900 bg-white border border-amber-300 hover:bg-amber-100 rounded-lg px-3 py-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry live connection
          </button>
        </div>
      </div>
    </div>
  );
};

export default ErrorCard;
