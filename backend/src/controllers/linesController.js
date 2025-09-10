import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const token = process.env.TOKEN;
const BASE_URL = process.env.BASE_URL_SP;

export const authenticate = async (req, res) => {
  try {
    const response = await axios.post(`${BASE_URL}/Login/Autenticar?token=${token}`);

    return response.data;
  } catch(err) {
    res.status(500).json({ message: "Internal server error", error: err.message });
  }
};

export const getPositions = async (req, res) => {
    try {
        const sessionToken = await authenticate();
        
        const response = await axios.get(`${BASE_URL}/Posicao`, {
            headers: { 'Authorization': `Bearer ${sessionToken}` }
        });
        res.status(200).json(response.data);
    } catch(err) {
        res.status(500).json({ message: "Internal server error", error: err.message });
    }
}