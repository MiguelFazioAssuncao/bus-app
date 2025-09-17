import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const token = process.env.TOKEN_LINE;
const BASE_URL = process.env.BASE_URL_SP;

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  withCredentials: true
});

let sessionCookies = "";

export const authenticate = async () => {
  try {
    const response = await axios.post(`${BASE_URL}/Login/Autenticar?token=${token}`);
    const setCookieHeader = response.headers["set-cookie"];

    if (setCookieHeader) {
      sessionCookies = setCookieHeader.join("; ");

    }

    return true; 
  } catch (err) {
    res.status(500).json({ message: "Internal server error", error: err.message });
  }
};

/* informações importantes de retorno
[string]ta = Indica o horário universal (UTC) em que a localização foi capturada. Essa informação está no padrão ISO 8601
[string]lt0 = Letreiro de destino da linha
[string]lt1 = Letreiro de origem da linha
*/
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
        res.status(500).json({ message: "Internal server error", error: err.message });
    }
}
