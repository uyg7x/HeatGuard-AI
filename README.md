# 🛡️ HeatGuard AI — Enterprise Urban Climate Intelligence Platform

> **FortyGuard Global AI Hackathon '26 Submission**  
> **Combining Track 01 (Resilient Cities & Infrastructure) & Track 06 (AI Agent Tools)**

HeatGuard AI is a $1M enterprise-grade climate-tech SaaS platform engineered for city planners, emergency response teams, and municipal authorities. It integrates real-time hyperlocal temperature data from the **FortyGuard Temperature API®** with autonomous reasoning and streaming execution from the **TCET CoE AI Gateway (Qwen3.6-35B)**.

---

## 🌟 Core Highlights & Architectural Principles

1. **Zero Mock Data Policy**  
   - Every single metric, zone, time-series timestamp, and heatmap point is derived exclusively from real API responses.
   - If an API call fails or keys are missing, HeatGuard AI displays a detailed, accessible **Error Card** showing the HTTP status, timestamp, target URL, and first 500 characters of the raw body.

2. **Server-Side Proxy Architecture**  
   - All client calls route through Next.js server-side API endpoints (`/api/fortyguard`, `/api/agent`, `/api/export`).
   - Protects API keys from client exposure and enforces rate limiting (100 req/min per IP).

3. **Geospatial Command Center**  
   - Built on React-Leaflet with zero SSR dynamic hook crashes.
   - Basemap toggle (CartoDB Dark Street, Esri World Imagery Satellite, OpenTopo Terrain).
   - Dynamic heatmap layer via `leaflet.heat` with adjustable opacity slider.
   - Pure React-Leaflet `<Polyline>` components for Fast (112°F, Extreme) vs. Safe (94°F, Moderate) route comparisons.

4. **Autonomous AI Agent Autopilot (Track 06)**  
   - Connected directly to TCET CoE AI Gateway running `qwen3.6` (OpenAI-compatible streaming protocol).
   - Real-time action parsing (`[ACTION:SAFE]`, `[ACTION:FAST]`, `[ACTION:ALERT]`, `[ACTION:EXPORT]`) that updates the interactive map, triggers alert banners, or initiates PDF exports seamlessly.

---

## 📊 Core Dashboard Tabs (10 Dashboard Views)

1. **Heat Intelligence Core**: Temperature hero display (°F), risk level badge (Safe / Moderate / High / Extreme), measurement altitude (2m), and spatial resolution (10 mi²).
2. **Heatmap Overlay**: Interactive thermal map with continuous color scale (Green → Yellow → Orange → Red) and live opacity controls.
3. **Segmentation Engine**: Multi-polygon micro-zone overlays showing temperature variations across concrete, asphalt, and shaded areas.
4. **Statistics & Metadata Panel**: Complete environment parameters grid (Surface/Air temp, Humidity, Wind speed & direction, UV index, Pressure, Cloud cover) with accuracy metrics.
5. **Time of Measurement**: Measured timestamp (ISO 8601), data freshness indicator, local time formatting, and update frequency.
6. **Exceedance Analysis**: Bar charts quantifying hours exceeded above >100°F, >110°F, and >120°F thresholds vs. previous week.
7. **Time Series**: Recharts area visualization tracking surface vs. air temperatures across 24h, 7d, and 30d windows.
8. **Distribution**: Histogram of cell temperature counts across hyperlocal grid cells with statistical summary (min, max, mean, std dev).
9. **Analytics & Impact Calculators**: Integrated KPI overview with Carbon Footprint Calculator (CO₂ emissions from AC), Economic Loss Projections, and Health Illness Rate Predictions.
10. **Emergency System & AI Agent**: Real-time push notifications, response protocol tiers, emergency contacts, and the streaming AI Agent chat interface.

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18.x or 20.x
- npm or yarn

### 1. Clone & Install Dependencies

```bash
cd heatguard-ai
npm install
```

### 2. Configure Environment Variables

Create a `.env.local` file in the project root:

```ini
# FortyGuard Temperature API
FORTYGUARD_API_KEY=your_real_fortyguard_api_key
FORTYGUARD_BASE_URL=https://api.fortyguard.com/v1
FORTYGUARD_LOCATION=Phoenix, AZ

# TCET CoE AI Gateway (Qwen3.6)
AI_KEY=your_tcet_coe_gateway_key
AI_BASE_URL=https://ai.tcetcercd.in/v1

# Application
NEXT_PUBLIC_APP_NAME=HeatGuard AI
NEXT_PUBLIC_APP_VERSION=1.0.0
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔒 Security & Performance

- **Security Headers**: Configured in `next.config.mjs` (X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Referrer-Policy).
- **Accessibility (WCAG 2.1 AA)**: Full keyboard accessibility, ARIA live regions for streaming chat & alerts, high-contrast color ratios, and reduced motion support.
- **Glassmorphism Theme**: Dark slate palette (`#0F172A`), backdrop blur filters (`backdrop-blur-xl`), and smooth micro-animations.

---

## 📜 License

Created for the FortyGuard Global AI Hackathon '26.
# HeatGuard-AI
