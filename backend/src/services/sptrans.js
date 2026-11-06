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

const DEFAULT_SPTRANS_BASE_URL = "https://api.olhovivo.sptrans.com.br/v2.1";

export function createSptransService({
  token = process.env.TOKEN_LINE,
  baseURL = process.env.BASE_URL_SP ?? DEFAULT_SPTRANS_BASE_URL,
  client = axios.create({ timeout: 15000 }),
  cacheTtlMs = 0,
  sessionTtlMs = 0,
  staleIfErrorMs = 0,
} = {}) {
  const accessToken = token?.trim();
  const apiURL = baseURL?.trim().replace(/\/$/, "");
  let cachedCookie = null;
  let cookieExpiresAt = 0;
  let cachedPositions = null;
  let positionsExpiresAt = 0;
  let positionsStaleUntil = 0;
  let inflightPositions = null;

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

  async function authenticate({ force = false } = {}) {
    if (!accessToken || !apiURL) {
      throw new SptransError("SPTRANS_NOT_CONFIGURED", "authentication");
    }
    const now = Date.now();
    if (!force && sessionTtlMs > 0 && cachedCookie && now < cookieExpiresAt) {
      return cachedCookie;
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
      const cookies = response.headers?.["set-cookie"];
      // Cookie sends only name=value pairs, never Set-Cookie attributes such as Path/HttpOnly.
      const cookie = (Array.isArray(cookies) ? cookies : cookies ? [cookies] : [])
        .map((value) => value.split(";", 1)[0].trim())
        .filter(Boolean)
        .join("; ");
      if (!cookie) {
        throw new SptransError("SPTRANS_SESSION_MISSING", "authentication", response.status);
      }
      if (sessionTtlMs > 0) {
        cachedCookie = cookie;
        cookieExpiresAt = Date.now() + sessionTtlMs;
      }
      return cookie;
    });
  }

  async function authenticatedGet(step, path, params) {
    let cookie = await authenticate();
    try {
      return await request(step, async () => {
        const config = {
          headers: { Cookie: cookie },
          ...(params ? { params } : {}),
        };
        return await client.get(`${apiURL}${path}`, config);
      });
    } catch (error) {
      if (
        sessionTtlMs > 0 &&
        (error.upstreamStatus === 401 || error.upstreamStatus === 403)
      ) {
        cookie = await authenticate({ force: true });
        return await request(step, async () => {
          const config = {
            headers: { Cookie: cookie },
            ...(params ? { params } : {}),
          };
          return await client.get(`${apiURL}${path}`, config);
        });
      }
      throw error;
    }
  }

  async function fetchPositionsSnapshot() {
    const response = await authenticatedGet("positions", "/Posicao");
    if (!Array.isArray(response.data?.l)) {
      throw new SptransError("SPTRANS_INVALID_RESPONSE", "positions", response.status);
    }
    const now = Date.now();
    if (cacheTtlMs > 0 || staleIfErrorMs > 0) {
      cachedPositions = response.data;
      positionsExpiresAt = now + cacheTtlMs;
      positionsStaleUntil = now + Math.max(cacheTtlMs, staleIfErrorMs);
    }
    return response.data;
  }

  async function getPositions() {
    const now = Date.now();
    if (cacheTtlMs > 0 && cachedPositions && now < positionsExpiresAt) {
      return cachedPositions;
    }
    if (inflightPositions) {
      return inflightPositions;
    }
    const promise = fetchPositionsSnapshot()
      .catch((error) => {
        if (staleIfErrorMs > 0 && cachedPositions && Date.now() < positionsStaleUntil) {
          return cachedPositions;
        }
        throw error;
      })
      .finally(() => {
        inflightPositions = null;
      });
    if (cacheTtlMs > 0) {
      inflightPositions = promise;
    }
    return promise;
  }

  async function getLinePredictions(codigoLinha) {
    const lineId = Number(codigoLinha);
    if (!Number.isFinite(lineId) || lineId <= 0) {
      throw new SptransError("SPTRANS_INVALID_LINE", "predictions");
    }
    const [predResult, stopsResult] = await Promise.allSettled([
      authenticatedGet("predictions", "/Previsao/Linha", { codigoLinha: lineId }),
      authenticatedGet("stops", "/Parada/BuscarParadasPorLinha", { codigoLinha: lineId }),
    ]);

    const predictionData = predResult.status === "fulfilled" ? predResult.value?.data : null;
    const stopsData =
      stopsResult.status === "fulfilled" && Array.isArray(stopsResult.value?.data)
        ? stopsResult.value.data
        : [];

    if (!predictionData && predResult.status === "rejected" && stopsResult.status === "rejected") {
      throw predResult.reason;
    }

    const stopsWithPredictions = Array.isArray(predictionData?.ps) ? predictionData.ps : [];
    return {
      hr: predictionData?.hr || new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      cl: lineId,
      ps: stopsWithPredictions,
      stops: stopsData,
    };
  }

  async function searchStops(term) {
    const query = String(term || "").trim();
    if (!query) return [];
    const response = await authenticatedGet("stops", "/Parada/Buscar", { termosBusca: query });
    return Array.isArray(response.data) ? response.data : [];
  }

  async function searchLines(term) {
    const query = String(term || "").trim();
    if (!query) return [];
    const response = await authenticatedGet("lines", "/Linha/Buscar", { termosBusca: query });
    return Array.isArray(response.data) ? response.data : [];
  }

  return {
    authenticate,
    getPositions,
    getLinePredictions,
    searchStops,
    searchLines,
  };
}
