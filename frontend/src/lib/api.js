const baseURL = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");

// Every request has a deadline; navigation can also cancel the request.
export async function api(path, options = {}) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  const timer = setTimeout(abort, 15000);
  const { signal, ...requestOptions } = options;
  signal?.addEventListener("abort", abort, { once: true });
  if (signal?.aborted) abort();
  try {
    const response = await fetch(`${baseURL}${path}`, {
      ...requestOptions,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
      signal: controller.signal,
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data) {
      const error = new Error(
        response.status === 401
          ? "Sua sessão expirou ou os dados de acesso não conferem."
          : response.status === 409 || data?.message === "User already exists"
            ? "Este e-mail já tem uma conta. Entre para continuar."
            : "Não foi possível consultar o serviço. Tente novamente em instantes.",
      );
      error.status = response.status;
      throw error;
    }
    return data;
  } catch (error) {
    if (signal?.aborted) throw error;
    if (error.name === "AbortError")
      throw new Error(
        "A consulta demorou mais que o esperado. Tente novamente.",
      );
    if (error instanceof TypeError)
      throw new Error(
        "Não foi possível conectar. Verifique sua conexão e tente novamente.",
      );
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}
