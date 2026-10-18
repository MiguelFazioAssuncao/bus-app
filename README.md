# Bus App

Mobility app for São Paulo with React + Vite on the frontend and Express + PostgreSQL on the backend. The interface focuses on trip planning, destination discovery, and bus positions from SPTrans.

- Responsive, keyboard-accessible navigation in Portuguese.
- Light and dark themes with a saved preference.
- Place catalog, instant search, favorites, and recent destinations stored in the browser.
- Bus line lookup with filters, sorting, pagination, and stale data handling.
- OpenStreetMap with road routes from GraphHopper.
- Login, registration, and profile connected to the existing endpoints.

**Product limitation:** GraphHopper is configured with `profile: car`. Calculated routes are driving routes and do not provide bus itineraries or arrival predictions. Vehicle positions are supplied separately by SPTrans.

## Development

```bash
cd frontend
npm ci
npm run dev
```

Vite forwards `/api` to the backend at `http://localhost:3000`. Configure the services as described in [backend/README.md](backend/README.md). To host the frontend separately, set `VITE_API_URL` to the public API origin before building.

```bash
npm run build
npm run lint
```

Documentation: [frontend](frontend/README.md) and [backend](backend/README.md).

Public lookups start at `/directions`; `/search`, `/lines`, and `/stations` do not require login. Account pages are available at `/login`, `/register`, and `/profile`.
