// ============================================================
// HeatGuard AI — EmergencySystem Tab
// Real-time alerts + emergency protocols + push notifications
// ============================================================

'use client';

import React, { useState, useEffect } from 'react';
import { AlertTriangle, Phone, Bell, BellOff, Shield, Flame, MapPin, ExternalLink } from 'lucide-react';
import { FortyGuardTemperatureData, HeatAlert, EmergencyProtocol } from '../lib/types';
import { getRiskLevelInfo } from '../lib/utils';
import ErrorCard from './ErrorCard';

interface EmergencySystemProps {
  data: FortyGuardTemperatureData | null;
  loading: boolean;
  error: any;
  onRetry: () => void;
}

const EmergencySystem: React.FC<EmergencySystemProps> = ({ data, loading, error, onRetry }) => {
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotifPermission(Notification.permission);
    } else {
      setNotifPermission('unsupported');
    }
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="bg-white border border-slate-200 shadow-sm rounded-xl">
            <div className="skeleton-shimmer h-6 w-48 rounded mb-3" />
            <div className="skeleton-shimmer h-20 w-full rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (error || !data) {
    return <ErrorCard error={error || { message: 'No emergency data' }} onRetry={onRetry} title="Emergency System Unavailable" />;
  }

  const risk = getRiskLevelInfo(data.risk_level || 'safe');
  const currentTemp = data.temperature?.value ?? 0;

  const alerts: HeatAlert[] = [];
  if (currentTemp >= 120) {
    alerts.push({
      id: 'extreme-1',
      severity: 'emergency',
      title: 'EMERGENCY: Extreme Heat Event',
      message: `Surface temperature has reached ${currentTemp.toFixed(1)}°F. Immediate action required to protect lives.`,
      timestamp: new Date().toISOString(),
      recommendations: [
        'Issue immediate public health emergency declaration',
        'Open all cooling centers 24/7',
        'Deploy mobile cooling units to vulnerable areas',
        'Suspend outdoor work per OSHA guidelines',
        'Activate emergency medical surge protocols',
      ],
      active: true,
    });
  } else if (currentTemp >= 110) {
    alerts.push({
      id: 'warning-1',
      severity: 'warning',
      title: 'WARNING: Excessive Heat Warning',
      message: `Dangerous heat levels at ${currentTemp.toFixed(1)}°F. Heat-related illness likely with prolonged exposure.`,
      timestamp: new Date().toISOString(),
      recommendations: [
        'Issue excessive heat warning to residents',
        'Extend cooling center hours',
        'Deploy wellness checks to elderly residents',
        'Prepare emergency cooling stations',
      ],
      active: true,
    });
  } else if (currentTemp >= 100) {
    alerts.push({
      id: 'watch-1',
      severity: 'watch',
      title: 'WATCH: Heat Advisory',
      message: `Heat index at ${currentTemp.toFixed(1)}°F. Sensitive groups should take precautions.`,
      timestamp: new Date().toISOString(),
      recommendations: [
        'Stay hydrated and limit outdoor activity',
        'Check on vulnerable neighbors',
        'Visit cooling centers during peak hours',
      ],
      active: true,
    });
  }

  const protocols: EmergencyProtocol[] = [
    {
      level: 'extreme',
      title: 'Extreme Heat Emergency Protocol',
      actions: [
        'Activate Emergency Operations Center (EOC)',
        'Deploy all mobile cooling assets',
        'Open emergency cooling shelters 24/7',
        'Issue citywide emergency alert',
        'Coordinate with hospitals for heat illness surge',
      ],
      contacts: [
        { name: 'Emergency Services', phone: '911' },
        { name: 'Poison Control', phone: '1-800-222-1222' },
      ],
    },
    {
      level: 'high',
      title: 'High Heat Response Protocol',
      actions: [
        'Extend public pool and cooling center hours',
        'Increase outreach to vulnerable populations',
        'Coordinate utility companies for grid stability',
        'Issue public service announcements',
      ],
      contacts: [
        { name: 'City Emergency Mgmt', phone: '311' },
        { name: 'Red Cross', phone: '1-800-733-2767' },
      ],
    },
    {
      level: 'moderate',
      title: 'Moderate Heat Awareness',
      actions: [
        'Issue daily heat advisory',
        'Promote cooling center locations',
        'Coordinate tree-canopy shade programs',
      ],
      contacts: [
        { name: 'City Info Line', phone: '311' },
      ],
    },
  ];

  const requestNotifications = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    try {
      const perm = await Notification.requestPermission();
      setNotifPermission(perm);
      if (perm === 'granted') {
        new Notification('HeatGuard AI Active', {
          body: 'You will now receive real-time heat emergency alerts.',
          icon: '/icon.svg',
        });
      }
    } catch {
      /* user denied */
    }
  };

  const activeProtocol = protocols.find((p) => p.level === (data.risk_level || 'safe').toLowerCase()) || protocols[protocols.length - 1];

  return (
    <div className="space-y-4">
      {/* Active Alerts */}
      {alerts.filter((a) => a.active).length > 0 && (
        <div className="space-y-3">
          {alerts.filter((a) => a.active && !dismissed).map((alert) => (
            <div
              key={alert.id}
              role="alert"
              aria-live="assertive"
              className={`bg-white border-l-4 shadow-sm rounded-xl ${
                alert.severity === 'emergency' ? 'border-red-500 bg-red-50' :
                alert.severity === 'warning' ? 'border-orange-500 bg-orange-50' :
                'border-amber-500 bg-amber-50'
              }`}
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className={`w-6 h-6 flex-shrink-0 ${
                  alert.severity === 'emergency' ? 'text-red-500 live-pulse' :
                  alert.severity === 'warning' ? 'text-orange-500' : 'text-amber-500'
                }`} aria-hidden="true" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm uppercase tracking-wide text-slate-900">{alert.title}</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase ${
                      alert.severity === 'emergency' ? 'bg-red-500 text-white' :
                      alert.severity === 'warning' ? 'bg-orange-500 text-white' : 'bg-amber-500 text-white'
                    }`}>
                      {alert.severity}
                    </span>
                  </div>
                  <p className="text-sm mt-1 text-slate-700">{alert.message}</p>
                  <ul className="mt-3 space-y-1.5 text-xs">
                    {alert.recommendations.map((r, i) => (
                      <li key={i} className="flex items-start gap-2 text-slate-700">
                        <Shield className="w-3 h-3 text-orange-500 mt-0.5 flex-shrink-0" aria-hidden="true" />
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Notification Permission */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {notifPermission === 'granted' ? <Bell className="w-5 h-5 text-emerald-600" /> :
           notifPermission === 'denied' ? <BellOff className="w-5 h-5 text-red-500" /> :
           <Bell className="w-5 h-5 text-slate-400" />}
          <div>
            <div className="text-sm font-semibold text-slate-900">Push Notifications</div>
            <div className="text-xs text-slate-500">
              {notifPermission === 'unsupported' ? 'Not supported in this browser' :
               notifPermission === 'granted' ? 'Enabled — you will receive emergency alerts' :
               notifPermission === 'denied' ? 'Blocked — please enable in browser settings' :
               'Click to enable real-time emergency alerts'}
            </div>
          </div>
        </div>
        {notifPermission === 'default' && (
          <button
            type="button"
            onClick={requestNotifications}
            className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            Enable
          </button>
        )}
      </div>

      {/* Current Protocol */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-5">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-slate-900">
          <Flame className={`w-4 h-4 ${risk.color}`} aria-hidden="true" />
          Active Response Protocol: {activeProtocol.title}
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <h4 className="text-xs uppercase tracking-wider text-slate-500 mb-2">Required Actions</h4>
            <ul className="space-y-2">
              {activeProtocol.actions.map((a, i) => (
                <li key={i} className="flex items-start gap-2 p-2 rounded bg-slate-50 border border-slate-200 text-sm text-slate-800">
                  <span className="text-orange-500 font-bold">{i + 1}.</span>
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-xs uppercase tracking-wider text-slate-500 mb-2">Emergency Contacts</h4>
            <div className="space-y-2">
              {activeProtocol.contacts.map((c, i) => (
                <a
                  key={i}
                  href={`tel:${c.phone}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-emerald-600" aria-hidden="true" />
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{c.name}</div>
                      <div className="text-xs text-slate-500">{c.phone}</div>
                    </div>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                </a>
              ))}
            </div>

            <div className="mt-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
              <div className="flex items-center gap-2 text-blue-700 text-xs font-semibold mb-1">
                <MapPin className="w-3.5 h-3.5" /> Nearest Cooling Center
              </div>
              <div className="text-sm text-slate-800">{data.cooling_centers?.[0]?.name || 'See Map tab for shelter locations'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* All Protocol Tiers */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-5">
        <h3 className="text-sm font-semibold mb-3 text-slate-900">Response Protocol Tiers</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {protocols.map((p) => (
            <div key={p.level} className={`p-3 rounded-lg border ${
              p.level === data.risk_level ? 'border-orange-500 bg-orange-50' : 'border-slate-200 bg-slate-50'
            }`}>
              <div className={`text-xs uppercase tracking-wider mb-2 font-semibold ${
                p.level === 'extreme' ? 'text-red-600' :
                p.level === 'high' ? 'text-orange-600' : 'text-amber-600'
              }`}>{p.level} Risk</div>
              <div className="text-sm font-semibold mb-2 text-slate-900">{p.title}</div>
              <div className="text-xs text-slate-600">{p.actions.length} response actions</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EmergencySystem;
