# Bus App — Frontend

Portuguese interface for exploring São Paulo, checking bus positions, and organizing destinations. The updated design retains the brand orange (`#FFA652`), with light and dark themes, mobile navigation, and public lookups without registration.

## Development

In the `frontend` directory, install dependencies from the lockfile:

```sh
npm ci
```

Available commands:

```sh
npm run dev     # Vite server, usually at http://localhost:5173
npm run build   # Generate the production build in dist/
npm run lint    # Check JavaScript/JSX and React rules
npm run preview # Serve the build for local review
```

The interface uses React 19, React Router, and Vite. The design uses CSS with tokens, local SVG icons, and SVG illustrations. Secondary screens load on demand; Leaflet loads only on the map screen.

## API and environments

The API base URL is defined in `src/lib/api.js`:

- **Development:** the default base is `/api`. The proxy in `vite.config.js` forwards `/api/auth/login`, for example, to `http://localhost:3000/auth/login`.
- **Production:** configure `/api` forwarding on the hosting server or set `VITE_API_URL` before building. For an API on another domain, also configure backend CORS.

Example `.env.local` when the API uses a different address:

```dotenv
VITE_API_URL=https://api.example.com
```

Variables prefixed with `VITE_` become part of the public frontend code. SPTrans, GraphHopper, database, and JWT keys belong on the backend. See [backend/README.md](../backend/README.md) and [backend/.env.example](../backend/.env.example) to prepare the services.

Requests have a 15-second timeout, Portuguese error messages, and cancellation when leaving the screen. Live service queries require a configured backend; authentication, SPTrans, and GraphHopper were not validated with real credentials during this update.

## Pages and navigation

| Route | Content |
| --- | --- |
| `/` | Opens `/directions`, including for visitors. |
| `/directions` | Overview, origin/destination, current location, home/work shortcuts, and discoveries. |
| `/search` | Local catalog search, category filters, favorites, recent destinations, and saved places. |
| `/lines` | Lines and directions with available SPTrans positions, search, sorting, favorites, and pagination. |
| `/stations` | Map, origin/destination, route calculation, and results with distance and duration. |
| `/profile` | Authenticated account details, theme, and sign-out; visitors can access login/registration. |
| `/login` | Email and password login, with validation, feedback, and access without an account. |
| `/register` | Registration with a name, email, and password of at least 8 characters. |

On desktop, navigation appears in the sidebar. On mobile, the four main areas appear in the bottom bar. Visible focus, skip links, form labels, keyboard-accessible suggestions, and modals with managed focus support accessible navigation. Animations respect `prefers-reduced-motion`.

## Main behaviors

### Destinations and search

Search offers suggestions from a small catalog in `src/lib/locations.js` and places saved in this browser. Matching ignores accents and letter case. Catalog coordinates are approximate destination points; they do not represent a bus stop database.

The frontend does not yet support address geocoding. For places outside the catalog, enter decimal latitude and longitude, such as `-23.5505,-46.6333`. Current location requires browser permission and a secure context (HTTPS or localhost).

Home, work, and other favorites can be saved without registration. Theme preferences, favorite lines, and recent destinations also stay on the device. Place data is separated by user or visitor, without synchronization across browsers or devices.

### Bus lines

`GET /lines/positions` provides line and vehicle data. The screen displays only positions reported by SPTrans, with manual updates and automatic updates every 30 seconds while the page is visible. When an update fails, the last successful result remains labeled with its receipt time.

You can search by line number/terminal, sort, filter favorites, and open a vehicle position on the map when valid coordinates are available. Positions do not provide arrival predictions. A favorite line appears in the list when the query returns data for it.

### Map and routes

The map uses Leaflet and OpenStreetMap tiles, with origin/destination markers and loading/error states. The backend queries GraphHopper through `GET /stations/route?point1=lat,lng&point2=lat,lng`.

The current backend profile is **car**: duration and route geometry are road references, without bus itineraries, line connections, or arrival predictions. The interface displays this information alongside trip planning. Public transit routing is a future integration.

### Account

`POST /auth/register` creates the account and returns the user without starting a session. After registration, the interface opens the login screen with a confirmation. Only `POST /auth/login`, which returns `{ token, user }`, saves the session.

`GET /auth/me` confirms the details displayed in the profile. Invalid or expired sessions prompt the user to sign in again. Signing out clears `token`, `user`, and the legacy `passwordLength`; the interface does not store or log passwords or their length. Forms support keyboard submission and toggling password visibility.

## Local persistence

| Key | Purpose |
| --- | --- |
| `token`, `user` | JWT session and safe user profile returned by the backend. |
| `busapp-theme` | Light or dark theme; defaults to the system theme when no preference is saved. |
| `homeInfo_<id>`, `workInfo_<id>` | Home/work shortcuts. |
| `favorites_<id>`, `recents_<id>` | Favorite and recent places. |
| `favoriteLines_<id>` | Favorite line identifiers. |

The suffix is the account ID or `anon` for visitors. Invalid reads fall back to an empty state; the user receives feedback when the browser prevents a write. The offline indicator explains that lookups, maps, and authentication require a connection. The app does not yet include installation/offline caching through a service worker.

## Structure

```text
src/
  components/
    AppLayout.jsx       # Navigation, main area, and offline indicator
    AuthFrame.jsx       # Shared login/registration structure
    CityIllustration.jsx
    LocationInput.jsx   # Combobox with suggestions and keyboard support
    TransitMap.jsx      # Leaflet, tiles, and route geometry
    ui.jsx              # Icons, theme buttons, modal, skeleton, and empty states
  lib/
    api.js              # API base URL, timeout, and cancellation
    locations.js        # Catalog, normalization, and coordinate resolution
    storage.js          # Persistence per user/visitor
    theme.js            # Theme and change subscriptions
  pages/                # Route pages
  styles/               # Styles by area
  App.jsx               # Routes and on-demand loading
  App.css               # Layout and shared components
  index.css             # Design tokens and base styles
```

`Header.jsx` and `Footer.jsx` remain as legacy files; the current flow uses `AppLayout.jsx`.

## Review and upcoming integrations

Before publishing, run build/lint and review the screens on mobile and desktop, in both themes, with keyboard navigation and reduced motion. Also validate empty states, network failures, expired sessions, and live services with the backend environment.

The next product priorities are address geocoding, public transit itineraries, and synchronizing places with the account. Core Web Vitals measurements and an accessibility audit of the deployed environment complete production verification.
