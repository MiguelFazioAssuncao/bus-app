
import axios from "axios"; // Importa biblioteca para requisições HTTP
import dotenv from "dotenv"; // Importa biblioteca para variáveis de ambiente

dotenv.config(); // Carrega variáveis do arquivo .env

const KEY = process.env.GRAPH_HOPPER_API_KEY; // Chave da API GraphHopper
const BASE_URL = process.env.GRAPH_HOPPER_BASE_URL; // URL base da API GraphHopper

const axiosInstance = axios.create({ // Instância do axios para requisições à API
  baseURL: BASE_URL,
  params: {
    key: KEY,
  },
});

// Função para buscar rota entre dois pontos
export const getRoute = async (req, res) => {
  try {
    const { point1, point2 } = req.query; // Extrai pontos da query string

    if (!point1 || !point2) { // Valida se os pontos foram enviados
      return res
        .status(400)
        .json({
          message: "Os parâmetros 'point1' e 'point2' são obrigatórios.",
        });
    }

    const point1Valid = /^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(point1); // Valida formato do ponto 1
    const point2Valid = /^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(point2); // Valida formato do ponto 2

    if (!point1Valid || !point2Valid) { // Se formato inválido, retorna erro
      return res
        .status(400)
        .json({
          message:
            "Os parâmetros 'point1' e 'point2' devem estar no formato 'latitude,longitude'.",
        });
    }

    let response; // Variável para resposta da API
    try {
      response = await axiosInstance.get(`/route`, { // Faz requisição à API GraphHopper
        params: {
          point: [point1, point2], // Pontos de origem e destino
          profile: "car", // Perfil de rota (carro)
          locale: "pt-BR", // Localização/idioma
          instructions: true, // Solicita instruções detalhadas
        },
        paramsSerializer: (params) => { // Serializa parâmetros para a URL
          return Object.keys(params)
            .map((key) => {
              if (Array.isArray(params[key])) {
                return params[key].map((val) => `${key}=${val}`).join("&");
              }
              return `${key}=${params[key]}`;
            })
            .join("&");
        },
      });
      console.log("Resposta completa da API GraphHopper:", JSON.stringify(response.data, null, 2)); // Loga resposta completa
    } catch (apiErr) {
      console.error("Erro ao chamar GraphHopper:", apiErr?.response?.data || apiErr.message); // Loga erro da API
      return res.status(502).json({
        message: "Erro ao obter rota do GraphHopper.",
        error: apiErr?.response?.data || apiErr.message
      });
    }

    if (!response.data || !Array.isArray(response.data.paths) || !response.data.paths.length) { // Valida resposta da API
      console.error("Resposta inesperada da API GraphHopper:", JSON.stringify(response.data, null, 2));
      return res.status(502).json({
        message: "Falha ao obter rota do GraphHopper.",
        response: response.data
      });
    }

    const distance = Math.round(response.data.paths[0].distance); // Calcula distância total da rota
    const timeInMinutes = Math.round(response.data.paths[0].time / 60000); // Calcula tempo estimado em minutos

    console.log(`Distância total da rota (em metros): ${distance}m`); // Loga distância
    console.log(`Tempo estimado de viagem (em minutos): ${timeInMinutes}min`); // Loga tempo

    res.status(200).json(response.data); // Retorna dados da rota
  } catch (err) {
    console.error("Erro inesperado em getRoute:", err); // Loga erro inesperado
    res
      .status(500)
      .json({ message: "Internal server error", error: err.message }); // Retorna erro interno
  }
};
export default axiosInstance; // Exporta instância do axios
