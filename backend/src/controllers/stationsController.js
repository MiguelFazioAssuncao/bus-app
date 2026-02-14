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
          message: "Parameters 'point1' and 'point2' are required.",
        });
    }

    const point1Valid = /^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(point1);
    const point2Valid = /^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(point2);

    if (!point1Valid || !point2Valid) {
      return res
        .status(400)
        .json({
          message:
            "Parameters 'point1' and 'point2' must be in the format 'latitude,longitude'.",
        });
    }

    let response;
    try {
      response = await axiosInstance.get(`/route`, {
        params: {
          point: [point1, point2],
          profile: "car",
          locale: "en",
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
      console.log("Full GraphHopper API response:", JSON.stringify(response.data, null, 2));
    } catch (apiErr) {
      console.error("Error calling GraphHopper:", apiErr?.response?.data || apiErr.message);
      return res.status(502).json({
        message: "Failed to fetch route from GraphHopper.",
        error: apiErr?.response?.data || apiErr.message
      });
    }

    if (!response.data || !Array.isArray(response.data.paths) || !response.data.paths.length) {
      console.error("Unexpected GraphHopper API response:", JSON.stringify(response.data, null, 2));
      return res.status(502).json({
        message: "Failed to fetch route from GraphHopper.",
        response: response.data
      });
    }

    const distance = Math.round(response.data.paths[0].distance);
    const timeInMinutes = Math.round(response.data.paths[0].time / 60000);

    console.log(`Total route distance (meters): ${distance}m`);
    console.log(`Estimated travel time (minutes): ${timeInMinutes}min`);

    res.status(200).json(response.data);
  } catch (err) {
    console.error("Unexpected error in getRoute:", err);
    res
      .status(500)
      .json({ message: "Internal server error", error: err.message });
  }
};
export default axiosInstance;
