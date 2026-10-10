import axios from "axios";
import "dotenv/config";

export class SptransError extends Error {
  constructor(code, step, upstreamStatus = null) {
    super(code);
    this.name = "SptransError";
    this.code = code;
    this.step = step;
    this.upstreamStatus = upstreamStatus;
  }
}

export function createSptransService({
  token = process.env.TOKEN_LINE,
  baseURL = process.env.BASE_URL_SP,
  client = axios.create({ timeout: 15000 }),
} = {}) {
  const accessToken = token?.trim();
  const apiURL = baseURL?.trim().replace(/\/$/, "");

  async function request(step, callback) {
    try {
      return await callback();
    } catch (error) {
      if (error instanceof SptransError) throw error;
      const status = error.response?.status ?? null;
      // Never retain or log Axios config: the login URL contains the access token.
      throw new SptransError(
        error.code === "ECONNABORTED" ? "SPTRANS_TIMEOUT" : "SPTRANS_UPSTREAM_ERROR",
        step,
        status,
      );
    }
  }

  async function authenticate() {
    if (!accessToken || !apiURL) {
      throw new SptransError("SPTRANS_NOT_CONFIGURED", "authentication");
    }
    return request("authentication", async () => {
      const response = await client.post(`${apiURL}/Login/Autenticar`, null, {
        params: { token: accessToken },
      });
      if (response.data !== true) {
        throw new SptransError("SPTRANS_AUTH_REJECTED", "authentication", response.status);
      }
      const cookies = response.headers["set-cookie"];
      // Cookie sends only name=value pairs, never Set-Cookie attributes such as Path/HttpOnly.
      const cookie = (Array.isArray(cookies) ? cookies : cookies ? [cookies] : [])
        .map((value) => value.split(";", 1)[0].trim())
        .filter(Boolean)
        .join("; ");
      if (!cookie) {
        throw new SptransError("SPTRANS_SESSION_MISSING", "authentication", response.status);
      }
      return cookie;
    });
  }

  async function getPositions() {
    const cookie = await authenticate();
    return request("positions", async () => {
      const response = await client.get(`${apiURL}/Posicao`, { headers: { Cookie: cookie } });
      if (!Array.isArray(response.data?.l)) {
        throw new SptransError("SPTRANS_INVALID_RESPONSE", "positions", response.status);
      }
      return response.data;
    });
  }

  return { authenticate, getPositions };
}
