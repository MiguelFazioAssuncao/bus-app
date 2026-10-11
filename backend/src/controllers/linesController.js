import { createSptransService } from "../services/sptrans.js";

const sptrans = createSptransService();
export const authenticate = () => sptrans.authenticate();

export const getPositions = async (_req, res) => {
  try {
    res.json(await sptrans.getPositions());
  } catch (error) {
    // Diagnostic fields deliberately exclude the token, cookies and upstream request URL.
    console.error("SPTrans request failed", {
      code: error.code,
      step: error.step,
      upstreamStatus: error.upstreamStatus,
      authResponseType: error.authResponseType,
      authResponseResult: error.authResponseResult,
    });
    res.status(503).json({
      message: "Dados da SPTrans indisponíveis. Tente novamente em alguns instantes.",
      code: error.code || "SPTRANS_UNAVAILABLE",
    });
  }
};
