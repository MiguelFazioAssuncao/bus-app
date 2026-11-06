import jwt from "jsonwebtoken";
import Preferences from "../models/Preferences.js";
import { getRoute } from "./stationsController.js";

const pointRegex = /^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/;
const DEFAULT_REF_POINT = "-23.55052,-46.633308";

function fmtDistance(m) {
  return m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`;
}
function fmtMinutes(ms) {
  return `${Math.round(ms / 60000)} min`;
}

function resolveUserId(req) {
  const explicit = req.body?.userId ?? req.query?.userId;
  if (explicit) return Number(explicit) || explicit;
  const authHeader = req.headers?.authorization || "";
  const parts = authHeader.split(" ");
  if (parts.length === 2 && parts[0] === "Bearer") {
    try {
      const payload = jwt.verify(parts[1], process.env.JWT_SECRET || "default_secret");
      return payload?.id ?? null;
    } catch {
      return null;
    }
  }
  return null;
}

export function parsePreferenceLocation(val, fallbackType = "home") {
  if (!val || typeof val !== "string") return null;
  const [mainPart, pointPart, addressPart] = val.split(" | ").map((s) => s.trim());
  const [namePart, rest] = (mainPart || "").split(" - ");
  let distanceMeters = null;
  let timeMinutes = null;
  let distance = null;
  let time = null;
  if (rest) {
    const match = /(\d+(?:\.\d+)?)m,\s*(\d+)min/.exec(rest);
    if (match) {
      distanceMeters = Math.round(parseFloat(match[1]));
      timeMinutes = parseInt(match[2], 10);
      distance =
        distanceMeters >= 1000
          ? `${(distanceMeters / 1000).toFixed(2)} km`
          : `${distanceMeters} m`;
      time = `${timeMinutes} min`;
    }
  }
  let lat = null;
  let lng = null;
  if (pointPart && pointRegex.test(pointPart)) {
    const [latStr, lngStr] = pointPart.split(",");
    lat = Number(latStr);
    lng = Number(lngStr);
  }
  return {
    id: `saved-${fallbackType}`,
    name: namePart || (fallbackType === "home" ? "Casa" : "Trabalho"),
    ...(pointPart ? { point: pointPart } : {}),
    ...(lat !== null && lng !== null ? { lat, lng } : {}),
    ...(addressPart ? { address: addressPart } : {}),
    distanceMeters,
    timeMinutes,
    distance,
    time,
  };
}

async function setUserLocation(req, res, type) {
  try {
    const nameField = type === "home" ? "homeName" : "workName";
    const userId = resolveUserId(req);
    const { point1, address } = req.body || {};
    const point2 = req.body?.point2 || DEFAULT_REF_POINT;
    const locationName = req.body?.[nameField] || req.body?.name;

    if (!userId || !locationName || !point1) {
      return res.status(400).json({
        message: `Fields 'userId', '${nameField}', 'point1' and 'point2' are required.`,
      });
    }
    if (!pointRegex.test(point1) || !pointRegex.test(point2)) {
      return res.status(400).json({ message: "Points must be in the format 'lat,lng'." });
    }

    let routeResult;
    const mockReq = { query: { point1, point2 } };
    const mockRes = {
      status: (code) => ({
        json: (data) => {
          routeResult = { code, data };
          return routeResult;
        },
      }),
    };

    await getRoute(mockReq, mockRes);

    const routeData = routeResult?.data;
    if (!routeData || !Array.isArray(routeData.paths) || !routeData.paths.length) {
      return res.status(502).json({ message: "Failed to fetch route." });
    }

    const best = routeData.paths[0];
    const distanceMeters = Math.round(best.distance);
    const timeMinutes = Math.max(1, Math.round(best.time / 60000));

    try {
      await Preferences.updateLocation(userId, type, locationName, distanceMeters, timeMinutes, {
        point: point1,
        address: address || "",
      });
    } catch (dbErr) {
      return res.status(500).json({ message: `Failed to save ${type} preference`, error: dbErr.message });
    }

    const [latStr, lngStr] = point1.split(",");
    return res.status(200).json({
      message: `${type === "home" ? "Home" : "Work"} updated successfully.`,
      [type]: {
        id: `saved-${type}`,
        name: locationName,
        point: point1,
        lat: Number(latStr),
        lng: Number(lngStr),
        ...(address ? { address } : {}),
        distanceMeters,
        timeMinutes,
        distance: fmtDistance(distanceMeters),
        time: `${timeMinutes} min`,
      },
      routePreview: {
        distance: fmtDistance(best.distance),
        time: fmtMinutes(best.time),
      },
    });
  } catch (err) {
    return res.status(500).json({ message: "Internal server error", error: err.message });
  }
}

export const setHome = (req, res) => setUserLocation(req, res, "home");
export const setWork = (req, res) => setUserLocation(req, res, "work");

export const getPreferences = async (req, res) => {
  try {
    const userId = resolveUserId(req);
    if (!userId) {
      return res.status(400).json({ message: "The 'userId' parameter is required." });
    }

    const prefs = await Preferences.findOne({ where: { userId } });

    return res.json({
      home: parsePreferenceLocation(prefs?.home, "home"),
      work: parsePreferenceLocation(prefs?.work, "work"),
      favorites: prefs?.favorites || [],
      recents: prefs?.recents || [],
    });
  } catch (err) {
    return res.status(500).json({ message: "Internal server error", error: err.message });
  }
};

export const savePreferences = async (req, res) => {
  try {
    const userId = resolveUserId(req);
    if (!userId) {
      return res.status(400).json({ message: "The 'userId' parameter is required." });
    }
    const { home, work, favorites, recents } = req.body || {};
    const prefs = await Preferences.upsertPreferences(userId, {
      home,
      work,
      favorites,
      recents,
    });
    return res.status(200).json({
      message: "Preferences synchronized successfully.",
      home: parsePreferenceLocation(prefs?.home, "home"),
      work: parsePreferenceLocation(prefs?.work, "work"),
      favorites: prefs?.favorites || [],
      recents: prefs?.recents || [],
    });
  } catch (err) {
    return res.status(500).json({ message: "Internal server error", error: err.message });
  }
};