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

function parseAuthenticationResult(value) {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (/^true$/i.test(trimmed)) return true;
  if (/^false$/i.test(trimmed)) return false;

  // Some upstream responses are JSON-encoded strings instead of bare booleans.
  try {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed === "boolean") return parsed;
    if (typeof parsed === "string" && /^(true|false)$/i.test(parsed.trim())) {
      return parsed.trim().toLowerCase() === "true";
    }
  } catch {
    // Keep unrecognized response bodies out of logs; diagnostics below record only their type.
  }
  return null;
}

function getAuthResponseDiagnostics(value) {
  const authResponseType = Array.isArray(value)
    ? "array"
    : value === null
      ? "null"
      : typeof value;
  const parsed = parseAuthenticationResult(value);
  return {
    authResponseType,
    authResponseResult: parsed,
  };
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
      const authResult = parseAuthenticationResult(response.data);
      if (authResult !== true) {
        const error = new SptransError("SPTRANS_AUTH_REJECTED", "authentication", response.status);
        Object.assign(error, getAuthResponseDiagnostics(response.data));
        throw error;
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
