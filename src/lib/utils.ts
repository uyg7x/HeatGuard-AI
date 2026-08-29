// ============================================================
// HeatGuard AI — Utility Functions
// ============================================================

import { RiskLevelInfo } from './types';

export const RISK_LEVELS: Record<string, RiskLevelInfo> = {
  safe: {
    label: 'SAFE',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/20',
    borderColor: 'border-emerald-500',
    icon: '\u2705',
    tone: 'emerald',
  },
  moderate: {
    label: 'MODERATE',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/20',
    borderColor: 'border-amber-500',
    icon: '\u26A0\uFE0F',
    tone: 'amber',
  },
  high: {
    label: 'HIGH',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/20',
    borderColor: 'border-orange-500',
    icon: '\uD83D\uDD25',
    tone: 'orange',
  },
  extreme: {
    label: 'EXTREME',
    color: 'text-red-500',
    bgColor: 'bg-red-500/20',
    borderColor: 'border-red-500',
    icon: '\uD83D\uDD25',
    tone: 'red',
  },
};

export function getRiskLevelInfo(level: string): RiskLevelInfo {
  const key = level?.toLowerCase() || 'safe';
  return RISK_LEVELS[key] || RISK_LEVELS.safe;
}

export function formatTemperature(value: number, unit?: string): string {
  const u = unit || '\u00B0F';
  return `${value.toFixed(1)} ${u}`;
}

export function formatTimestamp(isoString?: string): string {
  if (!isoString) return 'N/A';
  try {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short',
    });
  } catch {
    return isoString;
  }
}

export function timeSince(isoString?: string): string {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    return `${diffHrs}h ${diffMins % 60}m ago`;
  } catch {
    return '';
  }
}

export function logRequest(method: string, url: string, headers?: Record<string, string>, body?: any): void {
  const redactedHeaders = headers
    ? Object.entries(headers).reduce<Record<string, string>>((acc, [k, v]) => {
        if (k.toLowerCase().includes('key') || k.toLowerCase().includes('token')) {
          acc[k] = v.substring(0, 6) + '...' + v.substring(v.length - 4);
        } else {
          acc[k] = v;
        }
        return acc;
      }, {})
    : {};
  console.log('[HeatGuard API Request]', { method, url, headers: redactedHeaders, body: body ? JSON.stringify(body).substring(0, 200) : undefined, timestamp: new Date().toISOString() });
}

export function logResponse(url: string, status: number, body: any, latency: number): void {
  console.log('[HeatGuard API Response]', {
    url, status,
    body: typeof body === 'string' ? body.substring(0, 500) : JSON.stringify(body).substring(0, 500),
    latency: `${latency}ms`,
    timestamp: new Date().toISOString(),
  });
}

export function createApiError(httpStatus: number, rawResponse: string, requestUrl: string, headers?: Record<string, string>): any {
  return { httpStatus, rawResponse: rawResponse.substring(0, 500), requestUrl, timestamp: new Date().toISOString(), headers };
}

export function dataToCSV(data: any[], headers: string[]): string {
  const headerRow = headers.join(',');
  const rows = data.map((row) =>
    headers.map((h) => {
      const val = row[h];
      if (typeof val === 'string' && val.includes(',')) return `"${val}"`;
      return val ?? '';
    }).join(',')
  );
  return [headerRow, ...rows].join('\n');
}

export function temperatureToColor(temp: number, min: number, max: number): string {
  const normalized = Math.max(0, Math.min(1, (temp - min) / (max - min)));
  const r = Math.round(normalized * 255);
  const g = Math.round((1 - normalized) * 255);
  const b = 50;
  return `rgb(${r},${g},${b})`;
}

export function redactSensitive(input: string): string {
  return input.replace(/((?:api[_-]?key|authorization|token|secret)[\s]*[:=][\s]*)(\S+)/gi, '$1****REDACTED****');
}

export function buildSystemPrompt(data: any): string {
  const temp = data?.temperature?.value ?? 'N/A';
  const risk = data?.risk_level ?? 'Unknown';
  const location = data?.location ?? 'Unknown Location';
  const shelters = data?.cooling_centers
    ? data.cooling_centers.slice(0, 5).map((s: any) => `${s.name} (${s.ac_temperature}\u00B0F)`).join(', ')
    : 'None available';
  return `You are the HeatGuard AI Agent, an autonomous urban climate assistant for city planning and emergency response. You have access to real-time hyperlocal temperature data with 10 mi\u00B2 resolution measured at 2m above ground.

Current conditions:
- Location: ${location}
- Temperature: ${temp}\u00B0F
- Risk Level: ${risk}
- Measured At: ${data?.measured_at || 'Unknown'}

Available cooling shelters: ${shelters}

If the reply contains [ACTION:SAFE] switch map to Green Safe Route.
If the reply contains [ACTION:FAST] switch map to Red Fast Route.
If the reply contains [ACTION:ALERT] trigger emergency alert modal.
If the reply contains [ACTION:EXPORT] generate PDF report.
Strip all action tags from final UI text display.

Help users make safe decisions regarding heat safety, routes, cooling centers, and emergency protocols. Provide actionable recommendations based on current conditions. Be concise but thorough.`;
}

// ============================================================
// i18n — Multi-language support (English, Spanish, Hindi)
// ============================================================

export type LocaleCode = 'en' | 'es' | 'hi';

export interface LocalePack {
  code: LocaleCode;
  label: string;
  flag: string;
  strings: Record<string, string>;
}

export const LOCALES: Record<LocaleCode, LocalePack> = {
  en: {
    code: 'en',
    label: 'English',
    flag: 'EN',
    strings: {
      appTitle: 'HeatGuard AI',
      tagline: 'Every block. Every degree.',
      liveData: 'Live Heat Intelligence',
      measuredAt: 'Measured',
      heatCore: 'Heat Core',
      map: 'Map',
      analytics: 'Analytics',
      emergency: 'Emergency',
      vulnerable: 'Vulnerable',
      impact: 'Impact',
      community: 'Community',
      export: 'Export',
      chat: 'AI Agent',
      metadata: 'Metadata',
      retry: 'Retry',
      lastUpdate: 'Last update',
      riskSafe: 'SAFE',
      riskModerate: 'MODERATE',
      riskHigh: 'HIGH',
      riskExtreme: 'EXTREME',
    },
  },
  es: {
    code: 'es',
    label: 'Español',
    flag: 'ES',
    strings: {
      appTitle: 'HeatGuard IA',
      tagline: 'Cada cuadra. Cada grado.',
      liveData: 'Inteligencia Térmica en Vivo',
      measuredAt: 'Medido',
      heatCore: 'Núcleo',
      map: 'Mapa',
      analytics: 'Analítica',
      emergency: 'Emergencia',
      vulnerable: 'Vulnerable',
      impact: 'Impacto',
      community: 'Comunidad',
      export: 'Exportar',
      chat: 'Agente IA',
      metadata: 'Metadatos',
      retry: 'Reintentar',
      lastUpdate: 'Última actualización',
      riskSafe: 'SEGURO',
      riskModerate: 'MODERADO',
      riskHigh: 'ALTO',
      riskExtreme: 'EXTREMO',
    },
  },
  hi: {
    code: 'hi',
    label: 'हिन्दी',
    flag: 'HI',
    strings: {
      appTitle: 'हीटगार्ड AI',
      tagline: 'हर ब्लॉक। हर डिग्री।',
      liveData: 'लाइव हीट इंटेलिजेंस',
      measuredAt: 'मापा गया',
      heatCore: 'हीट कोर',
      map: 'मानचित्र',
      analytics: 'विश्लेषण',
      emergency: 'आपातकाल',
      vulnerable: 'संवेदनशील',
      impact: 'प्रभाव',
      community: 'समुदाय',
      export: 'निर्यात',
      chat: 'एआई एजेंट',
      metadata: 'मेटाडेटा',
      retry: 'पुनः प्रयास',
      lastUpdate: 'अंतिम अद्यतन',
      riskSafe: 'सुरक्षित',
      riskModerate: 'मध्यम',
      riskHigh: 'उच्च',
      riskExtreme: 'अत्यधिक',
    },
  },
};

export function t(locale: LocaleCode, key: string): string {
  return LOCALES[locale]?.strings[key] ?? LOCALES.en.strings[key] ?? key;
}

// ============================================================
// Misc formatting helpers
// ============================================================

export function formatNumber(value: number, digits: number = 0): string {
  return value.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function classNames(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export function debounce<T extends (...args: any[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return ((...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as T;
}

export function safeJson<T = any>(text: string, fallback: T): T {
  try { return JSON.parse(text) as T; } catch { return fallback; }
}

