# Bus App

A complete public transit app with integration to the SPTrans (Olho Vivo) and GraphHopper APIs for route planning.

## About the Project

Bus App is a modern solution to make public transportation easier. The app offers:

- **Real-time** vehicle position tracking
- **Smart route planning**
- **Preferences management** (home and work)
- **Intuitive, responsive UI**

## Architecture

The project is split into two main parts:

### Backend (REST API)
- **Node.js** with Express
- **PostgreSQL** database
- **Integration** with SPTrans and GraphHopper APIs
- **JWT authentication**

### Frontend

React web interface that consumes the backend API and delivers the user experience.

Technologies
- React + Vite
- React Router DOM
- Tailwind CSS (dark theme)
- Font Awesome (icons)
- Leaflet + OpenStreetMap (map)

Key features
- Header with search field that opens Search; footer navigation (Directions, Stations, Lines)
- Authentication (Login/Register) with redirect to Directions
- UserProfile with data via `GET /auth/me` and logout
- Directions with Home/Work and a modal to save user routes/preferences
- Lines with real-time data from `/lines/positions` (filtering, pagination, auto-refresh)
- Stations with route plotting (GraphHopper) and Leaflet map
- Search with user favorites/recents (localStorage persistence) and an Add location modal

Main routes
- `/login`, `/register`, `/directions`, `/lines`, `/stations`, `/search`, `/profile`

Scripts (in frontend/)
- `npm install` - install dependencies
- `npm run dev` - development (Vite)
- `npm run build` - production build
- `npm run preview` - preview the build

Full docs
- [Frontend documentation](./frontend/README.md)
- [Backend documentation](./backend/README.md)
