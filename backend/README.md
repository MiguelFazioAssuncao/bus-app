# Bus App - Backend

This project is the backend for the Bus App transit application, built with Node.js, Express, and Sequelize.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment setup](#environment-setup)
- [Local run](#local-run)
- [Run with Docker](#run-with-docker)
- [Main endpoints](#main-endpoints)

---

## Prerequisites

- Node.js >= 18
- npm
- PostgreSQL database (local or via Docker)
- (Optional) Docker and Docker Compose

## Environment setup

1. Clone the repository:
   ```sh
   git clone https://github.com/MiguelFazioAssuncao/bus-app.git
   cd bus-app/backend
   ```
2. Install dependencies:
   ```sh
   npm install
   ```
3. Configure the `.env` file with your credentials and keys:
   ```env
   PORT=8080
   JWT_SECRET=your_secret
   GRAPH_HOPPER_API_KEY=your_token_here
   GRAPH_HOPPER_BASE_URL=https://graphhopper.com/api/1
   # ... other parameters ...
   ```
4. Configure the database in `src/database/client.js` for your local or Docker instance.

## Local run

1. Make sure the database is running.
2. Start the backend:
   ```sh
   npm start
   ```
   The server will be available at `http://localhost:8080` (or the port defined in `.env`).

## Run with Docker

1. Ensure Docker and Docker Compose are installed.
2. Create a `docker-compose.yml` similar to the example below:
   ```yaml
   version: "3.8"
   services:
     db:
       image: postgres:15
       environment:
         POSTGRES_USER: user
         POSTGRES_PASSWORD: password
         POSTGRES_DB: busapp
       ports:
         - "5432:5432"
     backend:
       build: .
       environment:
         PORT: 8080
         JWT_SECRET: your_secret
         GRAPH_HOPPER_API_KEY: your_token_here
         GRAPH_HOPPER_BASE_URL: https://graphhopper.com/api/1
       ports:
         - "8080:8080"
       depends_on:
         - db
   ```
3. Run:
   ```sh
   docker-compose up --build
   ```

## Main endpoints

### Line positions

- `GET /lines/positions`
  **Example response:**
  ```json
  [
    {
    "hr": "15:10",
    "l": [
        {
            "c": "2008-10",
            "cl": 33665,
            "sl": 2,
            "lt0": "CPTM ITAIM PAULISTA",
            "lt1": "JD. NSA. SRA. DO CAMINHO",
            "qv": 5,
            "vs": [
                {
                    "p": 36060,
                    "a": true,
                    "ta": "2025-09-23T18:10:40Z",
                    "py": -23.52118775,
                    "px": -46.38765975,
                    "sv": null,
                    "is": null
                }
        }
  ]
  ```

### Route between points

- `GET /stations/route`
  **Query parameters:**

  - `point1`: string, start coordinate in "lat,lng" format (example: -23.55052,-46.633308)
  - `point2`: string, end coordinate in "lat,lng" format (example: -23.551234,-46.634567)

  **Request example:**

  ```http
  GET /stations/route?point1=-23.55052,-46.633308&point2=-23.551234,-46.634567
  ```

  **Response example:**

  ```json
  {
    "hints": {
      "visited_nodes.sum": 8,
      "visited_nodes.average": 8
    },
    "info": {
      "copyrights": ["GraphHopper", "OpenStreetMap contributors"],
      "took": 1,
      "road_data_timestamp": "2025-09-17T13:00:00Z"
    },
    "paths": [
      {
        "distance": 130.199,
        "weight": 31.293842,
        "time": 29341,
        "transfers": 0,
        "legs": [],
        "points_encoded": true,
        "points_encoded_multiplier": 100000,
        "bbox": [-46.63466, -23.551193, -46.63388, -23.550572],
        "points": "jwvnCvds{GEBc@zAzBz@",
        "instructions": [
          {
            "distance": 54.449,
            "heading": 324.61,
            "sign": 0,
            "interval": [0, 2],
            "text": "Continue on Praca da Se",
            "time": 19602,
            "street_name": "Praca da Se"
          },
          {
            "distance": 75.75,
            "sign": -2,
            "interval": [2, 3],
            "text": "Turn left on Praca da Se",
            "time": 9739,
            "street_name": "Praca da Se"
          },
          {
            "distance": 0,
            "sign": 4,
            "last_heading": 204.13340324920972,
            "interval": [3, 3],
            "text": "Destination reached!",
            "time": 0,
            "street_name": ""
          }
        ],
        "details": {},
        "ascend": 3.18304443359375,
        "descend": 1.3599853515625,
        "snapped_waypoints": "jwvnCvds{GpAzC"
      }
    ]
  }
  ```

### Authentication

- `POST /auth/login`
  **Payload:**

  ```json
  {
    "email": "user@email.com",
    "password": "password"
  }
  ```

  **Response example:**

  ```json
  {
    "message": "Login successful",
    "token": "<jwt_token>"
  }
  ```

- `POST /auth/register`
  **Payload:**
  ```json
  {
    "name": "New User",
    "email": "new@email.com",
    "password": "password"
  }
  ```
  **Response example:**
  ```json
  {
    "message": "User created successfully",
    "user": {
      "created_at": "2025-09-23T17:54:12.911Z",
      "id": 2,
      "name": "New User",
      "email": "new@email.com",
      "password": "<password>"
    }
  }
  ```

### Directions

- `POST /directions/setHome`
  **Payload:**
  ```json
  {
    "userId": 1,
    "homeName": "Home",
    "point1": "-23.55052,-46.633308",
    "point2": "-23.551234,-46.634567"
  }
  ```
  **Response example:**
  ```json
  {
    "message": "Home updated successfully.",
    "home": {
      "name": "Home",
      "point": "-23.55052,-46.633308",
      "distanceMeters": 130,
      "timeMinutes": 1,
      "distance": "0.13 km",
      "time": "1 min"
    },
    "routePreview": {
      "distance": "0.13 km",
      "time": "1 min"
    }
  }
  ```
- `POST /directions/setWork`
  **Payload:**
  ```json
  {
    "userId": 1,
    "workName": "Work",
    "point1": "-23.55052,-46.633308",
    "point2": "-23.551234,-46.634567"
  }
  ```
  **Response example:**
  ```json
  {
    "message": "Work updated successfully.",
    "work": {
      "name": "Work",
      "point": "-23.55052,-46.633308",
      "distanceMeters": 130,
      "timeMinutes": 1,
      "distance": "0.13 km",
      "time": "1 min"
    },
    "routePreview": {
      "distance": "0.13 km",
      "time": "1 min"
    }
  }
  ```

## Notes

- Make sure environment variables and database configuration are set correctly.
- For GraphHopper usage, get an API key at https://graphhopper.com/
- For questions, check the configuration files and source code.
