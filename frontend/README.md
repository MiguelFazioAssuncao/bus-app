# Bus App - Frontend

React web interface for a transit app with buses, routes, and user preferences. This frontend consumes the local backend API (Node/Express) and implements authentication, search, favorite directions, and real-time lines visualization.

## Overview

- Dark theme with variables:
  - `--primary-color: #FFA652`
  - Grays: `#6F6F6F`, `#9C9A9A`
  - Background: `#363636`
  - Cards: `#2D2B2B`
- Navigation: fixed header with search field; fixed footer with shortcuts (Directions, Stations, Lines).
- Main pages:
  - Directions: frequent destinations (Home/Work) with time/distance and a modal to save routes.
  - Lines: list of vehicles and real-time positions (lt0, lt1, ta) with filter, pagination, and auto-refresh.
  - Stations: map (Leaflet + OSM) and route plotting via GraphHopper.
  - Search: user favorites/recents and an Add location modal.
  - UserProfile: logged-in user data and logout.
  - Login/Register: authentication with redirect to Directions.

## Stack

- React + Vite
- React Router DOM
- Tailwind CSS (utility classes for the dark theme)
- Font Awesome (icons)
- Leaflet (map) + OpenStreetMap tiles
- Fetch/Axios for API integration (base: `http://localhost:3000`)

## Folder structure (summary)

```
frontend/
  public/
    bus1.png, bus2.png, favicon.ico
  src/
    components/
      Header.jsx
      Footer.jsx
    pages/
      Directions.jsx
      Lines.jsx
      Stations.jsx
      Search.jsx
      Login.jsx
      Register.jsx
      UserProfile.jsx
    App.jsx
    App.css
  index.html
```

## Routes

- `/login` - Login
- `/register` - Register
- `/directions` - Frequent destinations (Home/Work) with setup modal
- `/lines` - Real-time lines/vehicles
- `/stations` - Map and route plotting (GraphHopper)
- `/search` - Search screen, favorites, and recents
- `/profile` - User profile, logout
- `/` - Redirects to `/directions` if authenticated, otherwise `/login`

## Components

- `Header`: user icon (toggle profile) and search field (opens `/search`).
- `Footer`: bottom navigation with active route highlight.

## Core features

- JWT authentication (token stored in `localStorage`).
- `UserProfile` consumes `GET /auth/me` to fetch real user data.
- `Directions` saves and loads preferences per user via `directions` endpoints; persists `homeInfo`/`workInfo` in `localStorage`.
- `Lines` consumes `GET /lines/positions` and shows lt0/lt1/ta, with:
  - Text filter (origin/destination/vehicle)
  - Pagination and page size selection
  - Manual refresh and 30s auto-refresh
  - Local date/time formatting
- `Stations` calls `GET /stations/route?point1=lat,lng&point2=lat,lng`, decodes the polyline, and draws it on Leaflet, with distance/time summary.
- `Search` manages Favorites and Recents per user (keys `favorites_<userId>`/`recents_<userId>` in `localStorage`). The Add location modal adds items to Recents by default (not favorites).

## Variables and configuration

- API Base URL: `http://localhost:3000`
- JWT is stored in `localStorage.token` after login/register.
- Current user in `localStorage.user` (object with at least `id`, `name`, `email`).
- Local preferences:
  - `homeInfo`, `workInfo`: objects used by Directions.
  - `favorites_<userId>`, `recents_<userId>`: Search lists.

## How to run

1. Install dependencies:
   - `npm install`
2. Run in development (Vite default port):
   - `npm run dev`
3. Production build:
   - `npm run build`
4. Preview the build:
   - `npm run preview`

Make sure the backend is running at `http://localhost:3000`.

## Endpoints used

- `POST /auth/login` - Login (returns `{ token, user }`)
- `POST /auth/register` - Register (returns `{ token?, user }`)
- `GET /auth/me` - Authenticated user data
- `POST /directions/setHome` - Save user home
- `POST /directions/setWork` - Save user work
- `GET /directions/preferences?userId=...` - Fetch preferences
- `GET /lines/positions` - Real-time lines/vehicles (uses `l[].vs[]`)
- `GET /stations/route?point1=..&point2=..` - GraphHopper route (polyline/geojson)

## Style and icons

- Tailwind classes compose the dark theme (colors above).
- Font Awesome icons (user, search, map, favorite, etc.).

## State and persistence

- `localStorage` is used for:
  - `token`, `user`, `passwordLength`
  - `homeInfo`, `workInfo`
  - `favorites_<userId>`, `recents_<userId>`

## Troubleshooting tips

- Lines page shows "No vehicles available":
  - Check that `data.l[*].vs` exists in the backend response.
  - Verify CORS and the `/lines/positions` endpoint status.
- Stations map does not render or is clipped:
  - Verify Leaflet loads via CDN and call `invalidateSize` after mount.
  - Confirm `point1`/`point2` use the `lat,lng` format.
- Profile has no user data:
  - Check the token in `localStorage` and the `/auth/me` response.

## Roadmap (ideas)

- Sync Favorites/Recents with the backend per user.
- Select a point on the map (Stations) to populate Add location.
- Accessibility improvements and automated tests.

---

Built with React + Vite and lots of coffee.
