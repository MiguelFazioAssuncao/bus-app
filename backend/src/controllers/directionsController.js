import Preferences from "../models/Preferences.js"; // Importa o modelo de preferências
import { getRoute } from "./stationsController.js"; // Importa função para buscar rota

const pointRegex = /^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/; // Regex para validar formato dos pontos

function fmtDistance(m) { // Formata distância em metros ou km
  return m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`;
}
function fmtMinutes(ms) { // Formata tempo em minutos
  return `${Math.round(ms / 60000)} min`;
}


// Função genérica para salvar endereço (casa ou trabalho)
async function setUserLocation(req, res, type) {
  try {
    const nameField = type === 'home' ? 'homeName' : 'workName'; // Define campo do nome
    const { userId, point1, point2 } = req.body || {}; // Extrai dados do corpo da requisição
    const locationName = req.body?.[nameField]; // Extrai nome do endereço
    if (!userId || !locationName || !point1 || !point2) { // Valida campos obrigatórios
      return res.status(400).json({ message: `Os campos 'userId', '${nameField}', 'point1' e 'point2' são obrigatórios.` });
    }
    if (!pointRegex.test(point1) || !pointRegex.test(point2)) { // Valida formato dos pontos
      return res.status(400).json({ message: "Os pontos devem estar no formato 'lat,lng'." });
    }

    let routeResult; // Variável para armazenar resultado da rota
    const mockReq = { query: { point1, point2 } }; // Monta requisição mock para getRoute
    const mockRes = { // Monta resposta mock para capturar resultado
      status: (code) => ({
        json: (data) => {
          routeResult = { code, data };
          return routeResult;
        },
      }),
    };

    await getRoute(mockReq, mockRes); // Chama função de rota

    const routeData = routeResult?.data; // Extrai dados da rota
    if (!routeData || !Array.isArray(routeData.paths) || !routeData.paths.length) { // Valida retorno da rota
      return res.status(502).json({ message: "Falha ao obter rota." });
    }

    const best = routeData.paths[0]; // Seleciona melhor caminho
    const distanceMeters = Math.round(best.distance); // Calcula distância em metros
    const timeMinutes = Math.max(1, Math.round(best.time / 60000)); // Calcula tempo em minutos (mínimo 1)

    try {
      await Preferences.updateLocation(userId, type, locationName, distanceMeters, timeMinutes); // Salva endereço nas preferências
    } catch (dbErr) {
      return res.status(500).json({ message: `Erro ao salvar preferência de ${type}`, error: dbErr.message }); // Retorna erro de banco
    }

    return res.status(200).json({ // Retorna sucesso e dados do endereço
      message: `${type === 'home' ? 'Home' : 'Work'} atualizado com sucesso.`,
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
    return res.status(500).json({ message: "Internal server error", error: err.message }); // Retorna erro interno
  }
}

export const setHome = (req, res) => setUserLocation(req, res, 'home'); // Endpoint para salvar endereço de casa
export const setWork = (req, res) => setUserLocation(req, res, 'work'); // Endpoint para salvar endereço de trabalho