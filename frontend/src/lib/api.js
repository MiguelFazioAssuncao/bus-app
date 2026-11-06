const rawBaseURL = (import.meta.env.VITE_API_URL || "/api").trim().replace(/\/+$/, "");
const FALLBACK_CLOUD_API = "https://bus-app-api-0nql.onrender.com";

let apiStatus = "idle"; // "idle" | "waking" | "ready"
let warmupStarted = false;

function setApiStatus(next) {
  if (apiStatus === next) return;
  apiStatus = next;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("busapp-api-status"));
  }
}

export function getApiStatus() {
  return apiStatus;
}

export function subscribeApiStatus(callback) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("busapp-api-status", callback);
  return () => window.removeEventListener("busapp-api-status", callback);
}

function buildUrl(base, path) {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  if (base.endsWith("/api") && cleanPath.startsWith("/api/")) {
    return `${base}${cleanPath.slice(4)}`;
  }
  return `${base}${cleanPath}`;
}

async function fetchJsonWithDeadline(url, options, timeoutMs) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  const timer = setTimeout(abort, timeoutMs);
  const slowTimer =
    apiStatus !== "ready"
      ? setTimeout(() => setApiStatus("waking"), 3200)
      : null;

  const { signal, ...requestOptions } = options;
  signal?.addEventListener("abort", abort, { once: true });
  if (signal?.aborted) abort();

  try {
    const response = await fetch(url, {
      ...requestOptions,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
      signal: controller.signal,
    });
    const contentType = response.headers.get("content-type") || "";
    const isHtml = contentType.includes("text/html");
    const data = isHtml ? null : await response.json().catch(() => null);
    return { response, data, isHtml };
  } finally {
    clearTimeout(timer);
    if (slowTimer) clearTimeout(slowTimer);
    signal?.removeEventListener("abort", abort);
  }
}

// Every request has a generous deadline to survive cloud cold starts; navigation can also cancel the request.
export async function api(path, options = {}) {
  const timeoutMs = options.timeoutMs || 45000;
  const { signal } = options;

  try {
    let result = await fetchJsonWithDeadline(
      buildUrl(rawBaseURL, path),
      options,
      timeoutMs,
    );

    // If /api on a static host returned HTML index.html instead of proxying, fall back to the cloud API
    if (
      (result.isHtml || result.response.status === 404) &&
      rawBaseURL === "/api" &&
      typeof window !== "undefined" &&
      !window.location.hostname.includes("localhost") &&
      !window.location.hostname.includes("127.0.0.1")
    ) {
      result = await fetchJsonWithDeadline(
        buildUrl(FALLBACK_CLOUD_API, path),
        options,
        timeoutMs,
      );
    }

    const { response, data } = result;
    if (!response.ok || !data) {
      setApiStatus("ready");
      const error = new Error(
        response.status === 401
          ? "Sua sessão expirou ou os dados de acesso não conferem."
          : response.status === 409 || data?.message === "User already exists"
            ? "Este e-mail já tem uma conta. Entre para continuar."
            : data?.message && typeof data.message === "string" && /[áéíóúãõç]/i.test(data.message)
              ? data.message
              : "Não foi possível consultar o serviço. Tente novamente em instantes.",
      );
      error.status = response.status;
      error.code = data?.code;
      throw error;
    }

    setApiStatus("ready");
    return data;
  } catch (error) {
    if (signal?.aborted) throw error;
    if (apiStatus === "waking") setApiStatus("idle");
    if (error.name === "AbortError")
      throw new Error(
        "O servidor demorou para responder (possível inicialização em nuvem). Tente novamente em alguns segundos.",
      );
    if (error instanceof TypeError)
      throw new Error(
        "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.",
      );
    throw error;
  }
}

export function warmupApi() {
  if (warmupStarted || typeof window === "undefined") return;
  warmupStarted = true;
  api("/health", { timeoutMs: 50000 }).catch(() => {
    warmupStarted = false;
  });
}
