
import axios from "axios"; // Importa biblioteca para requisições HTTP
import dotenv from "dotenv"; // Importa biblioteca para variáveis de ambiente

dotenv.config(); // Carrega variáveis do arquivo .env

const token = process.env.TOKEN_LINE; // Token de autenticação da API Olho Vivo
const BASE_URL = process.env.BASE_URL_SP; // URL base da API Olho Vivo

const axiosInstance = axios.create({ // Instância do axios para requisições autenticadas
  baseURL: BASE_URL,
  withCredentials: true
});

let sessionCookies = ""; // Armazena cookies de sessão após autenticação

// Função para autenticar na API Olho Vivo
export const authenticate = async () => {
  try {
    const response = await axios.post(`${BASE_URL}/Login/Autenticar?token=${token}`); // Faz requisição de autenticação
    const setCookieHeader = response.headers["set-cookie"]; // Captura cookies da resposta

    if (setCookieHeader) {
      sessionCookies = setCookieHeader.join("; "); // Salva cookies para próximas requisições
    }

    return true; // Retorna sucesso
  } catch (err) {
    res.status(500).json({ message: "Internal server error", error: err.message }); // Retorna erro interno
  }
};

/* informações importantes de retorno
[string]ta = Indica o horário universal (UTC) em que a localização foi capturada. Essa informação está no padrão ISO 8601
[string]lt0 = Letreiro de destino da linha
[string]lt1 = Letreiro de origem da linha
*/

// Função para buscar posições dos veículos nas linhas
export const getPositions = async (req, res) => {
    try {
        await authenticate(); // Autentica antes de buscar posições
        
        const response = await axiosInstance.get(`/Posicao`, { // Faz requisição para buscar posições
          headers: {
            Cookie: sessionCookies, // Envia cookies de sessão
          },
        });
        res.status(200).json(response.data); // Retorna dados recebidos da API
    } catch(err) {
        res.status(500).json({ message: "Internal server error", error: err.message }); // Retorna erro interno
    }
}
