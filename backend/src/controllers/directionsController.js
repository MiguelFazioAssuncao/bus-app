import Preferences from "../models/Preferences.js";
import { getRoute } from "./stationsController.js";

const pointRegex = /^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/;

function fmtDistance(m) {
  return m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`;
}
function fmtMinutes(ms) {
  return `${Math.round(ms / 60000)} min`;
}

async function setUserLocation(req, res, type) {
  try {
    const nameField = type === 'home' ? 'homeName' : 'workName';
    const { userId, point1, point2 } = req.body || {};
    const locationName = req.body?.[nameField];
    if (!userId || !locationName || !point1 || !point2) {
      return res.status(400).json({ message: `Fields 'userId', '${nameField}', 'point1' and 'point2' are required.` });
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
      await Preferences.updateLocation(userId, type, locationName, distanceMeters, timeMinutes);
    } catch (dbErr) {
      return res.status(500).json({ message: `Failed to save ${type} preference`, error: dbErr.message });
    }

    return res.status(200).json({
      message: `${type === 'home' ? 'Home' : 'Work'} updated successfully.`,
      [type]: {
        name: locationName,
        point: point1,
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

export const setHome = (req, res) => setUserLocation(req, res, 'home');
export const setWork = (req, res) => setUserLocation(req, res, 'work');

export const getPreferences = async (req, res) => {
  try {
    const { userId } = req.query || {};
    if (!userId) {
      return res.status(400).json({ message: "The 'userId' parameter is required." });
    }

    const prefs = await Preferences.findOne({ where: { userId } });
    const parseEntry = (val) => {
      if (!val || typeof val !== 'string') return null;
      const [namePart, rest] = val.split(' - ');
      if (!rest) return { name: namePart };
      const match = /(\d+(?:\.\d+)?)m,\s*(\d+)min/.exec(rest);
      let distanceMeters = null, timeMinutes = null, distance = null, time = null;
      if (match) {
        distanceMeters = Math.round(parseFloat(match[1]));
        timeMinutes = parseInt(match[2], 10);
        distance = distanceMeters >= 1000 ? `${(distanceMeters/1000).toFixed(2)} km` : `${distanceMeters} m`;
        time = `${timeMinutes} min`;
      }
      return { name: namePart, distanceMeters, timeMinutes, distance, time };
    };

    return res.json({
      home: parseEntry(prefs?.home),
      work: parseEntry(prefs?.work),
    });
  } catch (err) {
    return res.status(500).json({ message: "Internal server error", error: err.message });
  }
};