// ============================================================
// HeatGuard AI — TypeScript Type Definitions
// All API request/response shapes + UI component props
// ============================================================

// --- FortyGuard API Types ---

export interface FortyGuardSubmitRequest {
  location: string;
  polygon?: [number, number][];
}

export interface FortyGuardSubmitResponse {
  activity_id?: string;
  job_id?: string;
  task_id?: string;
  status: string;
  data?: FortyGuardTemperatureData;
  error?: string;
}

export interface FortyGuardStatusResponse {
  activity_id?: string;
  job_id?: string;
  task_id?: string;
  status: string;
  progress?: number;
  data?: FortyGuardTemperatureData;
  result?: FortyGuardTemperatureData;
  error?: string;
}

export interface HeatmapPoint {
  lat: number;
  lng: number;
  temperature: number;
  radius?: number;
}

export interface ZoneData {
  id: string;
  name: string;
  temperature: number;
  risk_level: string;
  polygon: [number, number][];
  area_sq_mi: number;
  population?: number;
  land_type?: string;
}

export interface ExceedanceData {
  threshold: number;
  hours_exceeded: number;
  days_exceeded: number;
  consecutive_days: number;
  current_week_hours: number;
  previous_week_hours: number;
}

export interface TimeSeriesPoint {
  timestamp: string;
  temperature: number;
  air_temperature?: number;
  surface_temperature?: number;
  humidity?: number;
}

export interface DistributionData {
  cell_id: string;
  temperature: number;
  lat: number;
  lng: number;
  area_sq_mi: number;
}

export interface ForecastPoint {
  timestamp: string;
  temperature: number;
  confidence: number;
  risk_level?: string;
}

export interface CoolingCenter {
  id: string;
  name: string;
  lat: number;
  lng: number;
  capacity: number;
  current_occupancy: number;
  ac_temperature: number;
  accessibility: string;
  hours: string;
  address: string;
}

export interface Facility {
  id: string;
  name: string;
  type: 'school' | 'hospital' | 'elderly_care' | 'shelter';
  lat: number;
  lng: number;
  risk_level: string;
  temperature: number;
  population_served?: number;
  address: string;
}

export interface InfrastructureStressData {
  power_grid_load: number;
  water_system_stress: number;
  transportation_impact: string;
  critical_infrastructure_vulnerability: string;
  peak_demand_prediction: number;
}

export interface HealthImpactData {
  predicted_illness_rate: number;
  vulnerable_populations_at_risk: number;
  healthcare_capacity: string;
  prevention_recommendations: string[];
  heat_stress_index: number;
}

export interface EconomicImpactData {
  productivity_loss_estimate: number;
  healthcare_cost_projection: number;
  energy_cost_increase: number;
  total_economic_impact: number;
  ac_usage_estimate: number;
  co2_emissions_estimate: number;
}

export interface FortyGuardTemperatureData {
  location?: string;
  temperature?: {
    value?: number;
    unit?: string;
    measurement_height?: string;
    resolution?: string;
  };
  risk_level?: string;
  model_accuracy?: number;
  heat_stress_index?: number;
  air_temperature?: number;
  surface_temperature?: number;
  humidity?: number;
  wind_speed?: number;
  wind_direction?: number;
  uv_index?: number;
  atmospheric_pressure?: number;
  cloud_cover?: number;
  heat_index?: number;
  measured_at?: string;
  heatmap_data?: HeatmapPoint[];
  zones?: ZoneData[];
  exceedance_data?: ExceedanceData[];
  time_series?: TimeSeriesPoint[];
  distribution_data?: DistributionData[];
  forecast_data?: ForecastPoint[];
  cooling_centers?: CoolingCenter[];
  vulnerable_facilities?: Facility[];
  infrastructure_stress?: InfrastructureStressData;
  health_impact?: HealthImpactData;
  economic_impact?: EconomicImpactData;
  // Raw API response fragments for transparency
  raw_endpoints?: Record<string, unknown>;
}

export interface FortyGuardApiResponse {
  success: boolean;
  data?: FortyGuardTemperatureData;
  error?: string;
  httpStatus?: number;
  rawResponse?: string;
  requestUrl?: string;
  latency?: number;
  measured_at?: string;
  endpoints_called?: string[];
  // Per-city stats derived from the captured hyperlocal grid
  // (peak/mean/min/std, distribution, hot-cell count, etc.).
  cityStats?: {
    cityId: string;
    cityName: string;
    current: number;
    peak: number;
    min: number;
    mean: number;
    std: number;
    hotCells: number;
    totalCells: number;
    capturedAt: string;
    distribution: Array<{ range: string; count: number; mid: number }>;
    source: string;
    risk: string;
  };
  city?: string | null;
  cityName?: string;
  cached?: boolean;
  source?: string;
}

// --- AI Chat Types ---

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string | number;
  timestampMs?: number;
  actions?: AgentAction[];
  streaming?: boolean;
}

export interface AgentAction {
  type: 'SAFE' | 'FAST' | 'ALERT' | 'EXPORT';
  payload?: Record<string, unknown>;
}

// --- Community Types ---

export interface CommunityReport {
  id: string;
  title: string;
  description: string;
  category: 'broken_shade' | 'no_water' | 'asphalt_damage' | 'cooling_center' | 'other';
  lat: number;
  lng: number;
  timestamp: number;
  upvotes: number;
  status: 'open' | 'in_progress' | 'resolved';
  reporter?: string;
}

// --- AI Gateway Types ---

export interface AiGatewayRequest {
  model: string;
  messages: { role: string; content: string }[];
  max_tokens: number;
  temperature: number;
  stream: boolean;
}

export interface AiGatewayResponse {
  success: boolean;
  content?: string;
  error?: string;
  httpStatus?: number;
}

// --- Export Types ---

export interface ExportRequest {
  type: 'csv' | 'pdf';
  data?: FortyGuardTemperatureData;
  reportTitle?: string;
}

export interface ExportResponse {
  success: boolean;
  downloadUrl?: string;
  data?: string;
  error?: string;
}

// --- UI Component Types ---

export interface TabItem {
  id: string;
  label: string;
  icon: string;
  labelEn: string;
  labelEs: string;
  labelHi: string;
}

export interface RiskLevelInfo {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string;
  tone?: 'red' | 'orange' | 'amber' | 'emerald' | 'blue';
}

export interface EnvironmentalParam {
  key: string;
  label: string;
  icon: string;
  value?: string;
  trend: 'up' | 'down' | 'stable';
  unit?: string;
}

export interface DashboardMetrics {
  currentTemp: number;
  riskLevel: string;
  location: string;
  measuredAt: string;
  accuracy: string;
  resolution: string;
  altitude: string;
  latency: number;
  creditsRemaining: number;
  trend: 'up' | 'down' | 'stable';
}

export interface ApiError {
  httpStatus: number;
  rawResponse: string;
  requestUrl: string;
  timestamp: string;
  headers?: Record<string, string>;
  message?: string;
}

export interface ErrorCardProps {
  error: ApiError;
  onRetry?: () => void;
}

export interface MapLayer {
  id: string;
  name: string;
  enabled: boolean;
  color?: string;
}

export interface RouteOption {
  id: string;
  name: string;
  color: string;
  temperature: number;
  riskLevel: string;
  polyline: [number, number][];
  duration: string;
  distance: string;
}

export interface HeatAlert {
  id: string;
  severity: 'watch' | 'warning' | 'emergency';
  title: string;
  message: string;
  timestamp: string;
  recommendations: string[];
  active: boolean;
}

export interface EmergencyProtocol {
  level: string;
  title: string;
  actions: string[];
  contacts: { name: string; phone: string }[];
}
