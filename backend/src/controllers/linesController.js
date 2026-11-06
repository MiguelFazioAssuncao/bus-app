import { createSptransService } from "../services/sptrans.js";

const sptrans = createSptransService({
  cacheTtlMs: 15000,
  sessionTtlMs: 180000,
  staleIfErrorMs: 300000,
});

export const authenticate = () => sptrans.authenticate();

function handleSptransError(res, error) {
  // Diagnostic fields deliberately exclude the token, cookies and upstream request URL.
  console.error("SPTrans request failed", {
    code: error.code,
    step: error.step,
    upstreamStatus: error.upstreamStatus,
    authResponseType: error.authResponseType,
    authResponseResult: error.authResponseResult,
  });
  const status = error.code === "SPTRANS_INVALID_LINE" ? 400 : 503;
  res.status(status).json({
    message:
      status === 400
        ? "Código de linha inválido."
        : "Dados da SPTrans indisponíveis. Tente novamente em alguns instantes.",
    code: error.code || "SPTRANS_UNAVAILABLE",
  });
}

function normalizeText(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export const getPositions = async (req, res) => {
  try {
    const data = await sptrans.getPositions();
    const q = normalizeText(req.query?.q || "");
    const cl = req.query?.cl ? String(req.query.cl).trim() : "";
    const code = normalizeText(req.query?.code || "");

    if (!q && !cl && !code) {
      return res.json(data);
    }

    const filteredLines = (data.l || []).filter((line) => {
      if (!line || typeof line !== "object") return false;
      if (cl && String(line.cl) === cl) return true;
      if (code && normalizeText(line.c) === code) return true;
      if (q) {
        const text = normalizeText(`${line.c || ""} ${line.lt0 || ""} ${line.lt1 || ""}`);
        return text.includes(q);
      }
      return false;
    });

    return res.json({
      hr: data.hr,
      l: filteredLines,
    });
  } catch (error) {
    handleSptransError(res, error);
  }
};

export const getLinePredictions = async (req, res) => {
  try {
    const { cl } = req.params;
    const data = await sptrans.getLinePredictions(cl);
    res.json(data);
  } catch (error) {
    handleSptransError(res, error);
  }
};

export const getStops = async (req, res) => {
  try {
    const q = String(req.query?.q || "").trim();
    if (!q) {
      return res.status(400).json({ message: "O parâmetro 'q' é obrigatório." });
    }
    const stops = await sptrans.searchStops(q);
    res.json({ stops });
  } catch (error) {
    handleSptransError(res, error);
  }
};

export const searchLinesCatalog = async (req, res) => {
  try {
    const q = String(req.query?.q || "").trim();
    if (!q) {
      return res.status(400).json({ message: "O parâmetro 'q' é obrigatório." });
    }
    const lines = await sptrans.searchLines(q);
    res.json({ lines });
  } catch (error) {
    handleSptransError(res, error);
  }
};
