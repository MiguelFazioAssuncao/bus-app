import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const token = process.env.TOKEN_LINE;
const BASE_URL = process.env.BASE_URL_SP;

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  timeout: 15000
});

let sessionCookies = "";

export const authenticate = async () => {
  try {
    if (!token || !BASE_URL) throw new Error("SPTrans não configurado");
    const response = await axios.post(`${BASE_URL}/Login/Autenticar?token=${token}`, null, { timeout: 15000 });
    const setCookieHeader = response.headers["set-cookie"];

    if (setCookieHeader) {
      sessionCookies = setCookieHeader.join("; ");
    }

    return true;
  } catch (err) {
    throw err;
  }
};

export const getPositions = async (req, res) => {
    try {
        await authenticate();
        
        const response = await axiosInstance.get(`/Posicao`, {
          headers: {
            Cookie: sessionCookies,
          },
        });
        res.status(200).json(response.data);
    } catch(err) {
        res.status(503).json({ message: "Dados da SPTrans indisponíveis. Verifique a configuração do serviço." });
    }
}
