// ============================================================
// HeatGuard AI — CommunityHub Tab
// Crowd-sourced heat issue reports & engagement
// STRICT ZERO MOCK DATA POLICY COMPLIANT
// ============================================================

'use client';

import React, { useState } from 'react';
import { MessageSquare, ThumbsUp, Plus, MapPin, CheckCircle2, Clock, Send, AlertCircle } from 'lucide-react';
import { CommunityReport } from '../lib/types';
import { timeSince } from '../lib/utils';

interface CommunityHubProps {
  data: any;
  loading: boolean;
  error: any;
  onRetry: () => void;
}

const CommunityHub: React.FC<CommunityHubProps> = ({ data, loading, error, onRetry }) => {
  const [reports, setReports] = useState<CommunityReport[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<Partial<CommunityReport>>({ category: 'broken_shade' });

  if (loading) {
    return <div className="bg-white border border-slate-200 shadow-sm rounded-xl skeleton-shimmer h-48 w-full" />;
  }

  const submitReport = () => {
    if (!draft.title || !draft.description) return;
    const newReport: CommunityReport = {
      id: `r-${Date.now()}`,
      title: draft.title,
      description: draft.description,
      category: (draft.category as CommunityReport['category']) || 'other',
      lat: data?.heatmap_data?.[0]?.lat || 0,
      lng: data?.heatmap_data?.[0]?.lng || 0,
      timestamp: Date.now(),
      upvotes: 0,
      status: 'open',
    };
    setReports([newReport, ...reports]);
    setShowForm(false);
    setDraft({ category: 'broken_shade' });
  };

  const upvote = (id: string) => {
    setReports(reports.map((r) => (r.id === id ? { ...r, upvotes: r.upvotes + 1 } : r)));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2 text-slate-900">
            <MessageSquare className="w-4 h-4 text-orange-500" /> Community Heat Reports
          </h3>
          <p className="text-xs text-slate-500 mt-1">{reports.length} user-submitted reports · crowd-sourced climate resilience</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="px-3.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Submit Report
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-orange-200 shadow-sm rounded-xl p-5 space-y-3 slide-up">
          <h4 className="text-sm font-semibold text-orange-600">Report Heat Infrastructure Issue</h4>
          <input
            type="text"
            placeholder="Issue Title (e.g., Damaged shade structure at Central Park)"
            value={draft.title || ''}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-slate-300 text-sm focus:outline-none focus:border-orange-500 text-slate-900 placeholder:text-slate-400"
          />
          <textarea
            placeholder="Detailed description of the issue..."
            value={draft.description || ''}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-slate-300 text-sm focus:outline-none focus:border-orange-500 min-h-[80px] text-slate-900 placeholder:text-slate-400"
          />
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <select
              value={draft.category}
              onChange={(e) => setDraft({ ...draft, category: e.target.value as any })}
              className="flex-1 px-3.5 py-2.5 rounded-lg bg-white border border-slate-300 text-sm focus:outline-none focus:border-orange-500 text-slate-900 cursor-pointer"
            >
              <option value="broken_shade">Broken Shade Canopy</option>
              <option value="no_water">No Water Station Access</option>
              <option value="asphalt_damage">Infrastructure / Asphalt Heat Damage</option>
              <option value="cooling_center">Cooling Center Suggestion</option>
              <option value="other">Other Heat Issue</option>
            </select>
            <button
              type="button"
              onClick={submitReport}
              disabled={!draft.title || !draft.description}
              className="px-4 py-2.5 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Send className="w-4 h-4" /> Submit Report
            </button>
          </div>
        </div>
      )}

      {reports.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 shadow-sm rounded-xl p-12 text-center text-slate-400 space-y-2">
          <AlertCircle className="w-8 h-8 text-slate-300 mx-auto" />
          <div className="text-sm font-medium text-slate-600">No community heat reports submitted yet</div>
          <div className="text-xs text-slate-400">Click "Submit Report" to log crowd-sourced heat hazards or shade canopy issues.</div>
        </div>
      ) : (
        <div className="space-y-2">
          {reports.map((r) => (
            <div key={r.id} className="bg-white border border-slate-200 shadow-sm rounded-xl p-4 hover:bg-slate-50 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-sm truncate text-slate-900">{r.title}</h4>
                    <StatusBadge status={r.status} />
                  </div>
                  <p className="text-xs text-slate-600 mt-1">{r.description}</p>
                  <div className="flex items-center gap-3 text-[10px] text-slate-500 mt-2">
                    {r.lat !== 0 && <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-orange-500" /> {r.lat.toFixed(3)}, {r.lng.toFixed(3)}</span>}
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {timeSince(new Date(r.timestamp).toISOString())}</span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 capitalize text-slate-600">{r.category.replace('_', ' ')}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => upvote(r.id)}
                  aria-label="Upvote this report"
                  className="flex flex-col items-center px-3 py-2 rounded-lg bg-slate-50 hover:bg-orange-50 border border-slate-200 transition-colors cursor-pointer"
                >
                  <ThumbsUp className="w-4 h-4 text-orange-500" />
                  <span className="text-xs font-bold mt-0.5 text-slate-900">{r.upvotes}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const StatusBadge: React.FC<{ status: CommunityReport['status'] }> = ({ status }) => {
  const colors = {
    open: 'bg-amber-50 text-amber-700 border-amber-200',
    in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
    resolved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };
  const icons = {
    open: <Clock className="w-2.5 h-2.5" />,
    in_progress: <MessageSquare className="w-2.5 h-2.5" />,
    resolved: <CheckCircle2 className="w-2.5 h-2.5" />,
  };
  return (
    <span className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded font-semibold flex items-center gap-1 border ${colors[status]}`}>
      {icons[status]} {status.replace('_', ' ')}
    </span>
  );
};

export default CommunityHub;
