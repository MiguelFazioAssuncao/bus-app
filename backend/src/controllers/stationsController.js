import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const DEFAULT_GH_BASE_URL = "https://graphhopper.com/api/1";
const OSRM_BASE_URL = "https://router.project-osrm.org";
const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org";

const axiosInstance = axios.create({
  baseURL: process.env.GRAPH_HOPPER_BASE_URL || DEFAULT_GH_BASE_URL,
  timeout: 15000,
});

const geocodeCache = new Map();
const GEOCODE_TTL_MS = 10 * 60 * 1000;

function parsePoint(pointStr) {
  const [latStr, lngStr] = String(pointStr).split(",");
  return { lat: Number(latStr), lng: Number(lngStr) };
}

function haversineMeters(p1, p2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(p2.lat - p1.lat);
  const dLng = toRad(p2.lng - p1.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(p1.lat)) * Math.cos(toRad(p2.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function formatOsrmInstruction(step) {
  const street = step.name || step.ref || "";
  const type = step.maneuver?.type || "";
  const mod = step.maneuver?.modifier || "";
  if (type === "depart") {
    return street ? `Siga por ${street}` : "Inicie o trajeto";
  }
  if (type === "arrive") {
    return "Você chegou ao destino";
  }
  if (type === "roundabout" || type === "rotary") {
    return street ? `Na rotatória, pegue a saída para ${street}` : "Contorne a rotatória";
  }
  const modMap = {
    left: "Vire à esquerda",
    "slight left": "Mantenha-se à esquerda",
    "sharp left": "Curva acentuada à esquerda",
    right: "Vire à direita",
    "slight right": "Mantenha-se à direita",
    "sharp right": "Curva acentuada à direita",
    uturn: "Faça o retorno",
    straight: "Continue em frente",
  };
  const action = modMap[mod] || "Continue";
  return street ? `${action} em ${street}` : action;
}

async function fetchOsrmRoute(point1, point2, profile = "car") {
  const p1 = parsePoint(point1);
  const p2 = parsePoint(point2);
  const osrmProfile =
    profile === "foot" ? "foot" : profile === "bike" ? "bike" : "driving";

  const url = `${OSRM_BASE_URL}/route/v1/${osrmProfile}/${p1.lng},${p1.lat};${p2.lng},${p2.lat}`;
  const response = await axios.get(url, {
    timeout: 12000,
    params: {
      overview: "full",
      geometries: "geojson",
      steps: "true",
    },
  });

  const route = response.data?.routes?.[0];
  if (!route || !route.geometry?.coordinates?.length) {
    throw new Error("Invalid OSRM route response");
  }

  // OSRM driving durations use free-flow speeds; adjust for non-car profiles when needed
  const speedRatio =
    profile === "foot"
      ? 1.0
      : profile === "bike"
        ? 1.0
        : 1.0;
  const timeMs = Math.max(
    60000,
    Math.round(
      (profile === "foot"
        ? route.distance / 1.3
        : profile === "bike"
          ? route.distance / 4.2
          : route.duration * speedRatio) * 1000
    )
  );

  const steps = route.legs?.[0]?.steps || [];
  const instructions = steps.map((step) => ({
    distance: Math.round(step.distance || 0),
    time: Math.round((step.duration || 0) * 1000),
    text: formatOsrmInstruction(step),
    street_name: step.name || "",
  }));

  return {
    info: {
      copyrights: ["OpenStreetMap contributors", "OSRM"],
      took: 1,
    },
    paths: [
      {
        distance: route.distance,
        time: timeMs,
        points_encoded: false,
        points: route.geometry,
        instructions,
      },
    ],
  };
}

function buildGeometricFallback(point1, point2, profile = "car") {
  const p1 = parsePoint(point1);
  const p2 = parsePoint(point2);
  const directMeters = haversineMeters(p1, p2);
  const roadMeters = Math.max(50, Math.round(directMeters * 1.28));
  const speedMps = profile === "foot" ? 1.3 : profile === "bike" ? 4.2 : 8.3;
  const timeMs = Math.max(60000, Math.round((roadMeters / speedMps) * 1000));

  return {
    info: {
      copyrights: ["OpenStreetMap contributors"],
      took: 1,
      fallback: true,
    },
    paths: [
      {
        distance: roadMeters,
        time: timeMs,
        points_encoded: false,
        points: {
          type: "LineString",
          coordinates: [
            [p1.lng, p1.lat],
            [(p1.lng + p2.lng) / 2, (p1.lat + p2.lat) / 2],
            [p2.lng, p2.lat],
          ],
        },
        instructions: [
          {
            distance: roadMeters,
            time: timeMs,
            text: "Siga em direção ao destino selecionado",
            street_name: "",
          },
          {
            distance: 0,
            time: 0,
            text: "Você chegou ao destino",
            street_name: "",
          },
        ],
      },
    ],
  };
}

export const getRoute = async (req, res) => {
  try {
    const { point1, point2 } = req.query || {};
    const requestedProfile = String(req.query?.profile || "car").toLowerCase();
    const profile = ["car", "foot", "bike"].includes(requestedProfile)
      ? requestedProfile
      : "car";

    if (!point1 || !point2) {
      return res.status(400).json({
        message: "Parameters 'point1' and 'point2' are required.",
      });
    }

    const pointRegex = /^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/;
    if (!pointRegex.test(point1) || !pointRegex.test(point2)) {
      return res.status(400).json({
        message:
          "Parameters 'point1' and 'point2' must be in the format 'latitude,longitude'.",
      });
    }

    const apiKey = process.env.GRAPH_HOPPER_API_KEY?.trim();
    const baseUrl = (process.env.GRAPH_HOPPER_BASE_URL || DEFAULT_GH_BASE_URL).trim();

    if (apiKey && baseUrl) {
      try {
        const response = await axiosInstance.get(`/route`, {
          baseURL: baseUrl,
          params: {
            point: [point1, point2],
            profile,
            locale: "pt_BR",
            instructions: true,
            key: apiKey,
          },
          paramsSerializer: (params) =>
            Object.keys(params)
              .map((key) => {
                if (Array.isArray(params[key])) {
                  return params[key]
                    .map((val) => `${encodeURIComponent(key)}=${encodeURIComponent(val)}`)
                    .join("&");
                }
                return `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`;
              })
              .join("&"),
        });

        if (response.data && Array.isArray(response.data.paths) && response.data.paths.length) {
          return res.status(200).json(response.data);
        }
      } catch (apiErr) {
        console.warn("GraphHopper unavailable, falling back to OSRM:", apiErr?.response?.status || apiErr.message);
      }
    }

    // Fallback to OSRM so routing works even without a GraphHopper API key or during quota limits
    try {
      const osrmData = await fetchOsrmRoute(point1, point2, profile);
      return res.status(200).json(osrmData);
    } catch (osrmErr) {
      console.warn("OSRM fallback failed, using geometric estimate:", osrmErr.message);
      return res.status(200).json(buildGeometricFallback(point1, point2, profile));
    }
  } catch (err) {
    console.error("Unexpected error in getRoute:", err);
    return res
      .status(500)
      .json({ message: "Internal server error", error: err.message });
  }
};

function formatNominatimPlace(item) {
  const lat = Number(item.lat);
  const lng = Number(item.lon);
  const addr = item.address || {};
  const mainName =
    item.name ||
    addr.amenity ||
    addr.railway ||
    addr.tourism ||
    addr.leisure ||
    addr.road ||
    addr.suburb ||
    (item.display_name ? item.display_name.split(",")[0].trim() : "Local em São Paulo");

  const roadPart = [addr.road, addr.house_number].filter(Boolean).join(", ");
  const areaPart =
    addr.suburb || addr.neighbourhood || addr.city_district || addr.city || addr.town || "São Paulo";
  const subtitle = [roadPart && roadPart !== mainName ? roadPart : null, areaPart]
    .filter(Boolean)
    .join(" · ");

  return {
    id: `geo-${item.place_id || `${lat.toFixed(5)},${lng.toFixed(5)}`}`,
    name: mainName,
    address: subtitle || item.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
    lat,
    lng,
    category: "Endereços",
  };
}

export const geocodeAddress = async (req, res) => {
  try {
    const q = String(req.query?.q || "").trim();
    if (q.length < 2) {
      return res.json({ places: [] });
    }

    const cacheKey = `q:${q.toLowerCase()}`;
    const cached = geocodeCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return res.json({ places: cached.places });
    }

    const searchQuery = /s[aã]o paulo|\bsp\b/i.test(q) ? q : `${q}, São Paulo, SP`;
    const response = await axios.get(`${NOMINATIM_BASE_URL}/search`, {
      timeout: 8000,
      headers: {
        "User-Agent": "BusAppSaoPaulo/1.0 (https://bus-app-neon.vercel.app)",
        "Accept-Language": "pt-BR,pt;q=0.9",
      },
      params: {
        q: searchQuery,
        format: "jsonv2",
        addressdetails: 1,
        limit: 6,
        countrycodes: "br",
        viewbox: "-46.95,-23.30,-46.30,-23.85",
        bounded: 0,
      },
    });

    const places = (Array.isArray(response.data) ? response.data : [])
      .map(formatNominatimPlace)
      .filter(
        (place) =>
          Number.isFinite(place.lat) &&
          Number.isFinite(place.lng) &&
          Math.abs(place.lat) <= 90 &&
          Math.abs(place.lng) <= 180
      );

    geocodeCache.set(cacheKey, { places, expiresAt: Date.now() + GEOCODE_TTL_MS });
    return res.json({ places });
  } catch (err) {
    console.warn("Geocode lookup failed:", err.message);
    return res.json({ places: [] });
  }
};

export const reverseGeocode = async (req, res) => {
  try {
    const lat = Number(req.query?.lat);
    const lng = Number(req.query?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      return res.status(400).json({ message: "Valid 'lat' and 'lng' are required." });
    }

    const cacheKey = `rev:${lat.toFixed(4)},${lng.toFixed(4)}`;
    const cached = geocodeCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return res.json({ place: cached.place });
    }

    const response = await axios.get(`${NOMINATIM_BASE_URL}/reverse`, {
      timeout: 8000,
      headers: {
        "User-Agent": "BusAppSaoPaulo/1.0 (https://bus-app-neon.vercel.app)",
        "Accept-Language": "pt-BR,pt;q=0.9",
      },
      params: {
        lat,
        lon: lng,
        format: "jsonv2",
        addressdetails: 1,
      },
    });

    const place = response.data
      ? { ...formatNominatimPlace(response.data), lat, lng }
      : {
          id: `${lat},${lng}`,
          name: "Local selecionado",
          address: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
          lat,
          lng,
          category: "Mapa",
        };

    geocodeCache.set(cacheKey, { place, expiresAt: Date.now() + GEOCODE_TTL_MS });
    return res.json({ place });
  } catch {
    const lat = Number(req.query?.lat);
    const lng = Number(req.query?.lng);
    return res.json({
      place: {
        id: `${lat},${lng}`,
        name: "Local selecionado",
        address: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        lat,
        lng,
        category: "Mapa",
      },
    });
  }
};

export default axiosInstance;
