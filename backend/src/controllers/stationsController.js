import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const KEY = process.env.GRAPH_HOPPER_API_KEY;
const BASE_URL = process.env.GRAPH_HOPPER_BASE_URL;

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  params: {
    key: KEY,
  },
});

export const getRoute = async (req, res) => {
  try {
    const { point1, point2 } = req.query;

    if (!point1 || !point2) {
      return res
        .status(400)
        .json({
          message: "Os parâmetros 'point1' e 'point2' são obrigatórios.",
        });
    }

    const point1Valid = /^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(point1);
    const point2Valid = /^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(point2);

    if (!point1Valid || !point2Valid) {
      return res
        .status(400)
        .json({
          message:
            "Os parâmetros 'point1' e 'point2' devem estar no formato 'latitude,longitude'.",
        });
    }

    const response = await axiosInstance.get(`/route`, {
      params: {
        point: [point1, point2],
        profile: "car",
        locale: "pt-BR",
        instructions: true,
      },
      paramsSerializer: (params) => {
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

    const distance = Math.round(response.data.paths[0].distance);
    const timeInMinutes = Math.round(response.data.paths[0].time / 60000);

    console.log(`Distância total da rota (em metros): ${distance}m`);
    console.log(`Tempo estimado de viagem (em minutos): ${timeInMinutes}min`);

    res.status(200).json(response.data);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Internal server error", error: err.message });
  }
};
export default axiosInstance;
