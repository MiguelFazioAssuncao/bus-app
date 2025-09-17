import Preferences from "../models/Preferences.js";
import { getRoute } from "./stationsController.js";

const pointRegex = /^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/;

function fmtDistance(m) {
  return m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`;
}
function fmtMinutes(ms) {
  return `${Math.round(ms / 60000)} min`;
}

export const setHome = async (req, res) => {
  try {
    const { userId, homeName, point1, point2 } = req.body || {};
    if (!userId || !homeName || !point1 || !point2) {
      return res.status(400).json({ message: "Os campos 'userId', 'homeName', 'point1' e 'point2' são obrigatórios." });
    }
    if (!pointRegex.test(point1) || !pointRegex.test(point2)) {
      return res.status(400).json({ message: "Os pontos devem estar no formato 'lat,lng'." });
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
      return res.status(502).json({ message: "Falha ao obter rota." });
    }

    const best = routeData.paths[0];
    const distanceMeters = Math.round(best.distance);
    const timeMinutes = Math.round(best.time / 60000);

    try {
      await Preferences.updateHome(userId, homeName, distanceMeters, timeMinutes);
    } catch (dbErr) {
      return res.status(500).json({ message: "Erro ao salvar preferência", error: dbErr.message });
    }

    return res.status(200).json({
      message: "Home atualizado com sucesso.",
      home: {
        name: homeName,
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
};