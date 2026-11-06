# Bus App

Mobility app for São Paulo with React + Vite on the frontend and Express + PostgreSQL on the backend. The interface focuses on trip planning, live address search, destination discovery, and real-time bus positions and arrival predictions from SPTrans.

- Responsive, keyboard-accessible navigation in Portuguese.
- Light and dark themes with a saved preference.
- Expanded São Paulo place catalog (18 landmarks/terminals) + live address geocoding and reverse geocoding via OpenStreetMap Nominatim (`/stations/geocode`, `/stations/reverse`).
- Favorites, recent destinations, and Home/Work places with cloud synchronization (`/directions/preferences`).
- Bus line lookup with live SPTrans vehicle positions, session reuse & caching, wheelchair-accessibility filter (`♿`), and stop arrival predictions (`/lines/:cl/predictions`).
- Interactive OpenStreetMap with multi-modal road/walking/cycling routes (`car`, `foot`, `bike`), turn-by-turn steps, click-on-map origin/destination selection, live bus overlay on the map, and automatic OSRM/geometric fallback when GraphHopper is unavailable.
- Cold-start resilience for Render + Vercel deployments (automatic `/health` warm-up, `/api/*` Vercel proxy rewrite, and `/api` + `/` dual route mounting on the backend).

## Development

From the repository root:

```bash
npm run dev          # Starts Vite frontend
npm run dev:backend  # Starts Express backend
npm run build        # Builds production frontend
npm run lint         # Runs ESLint on frontend
npm test             # Runs Node test suite on backend
```

Documentation: [frontend](frontend/README.md) and [backend](backend/README.md).

Public lookups start at `/directions`; `/search`, `/lines`, and `/stations` do not require login. Account pages are available at `/login`, `/register`, and `/profile`.
