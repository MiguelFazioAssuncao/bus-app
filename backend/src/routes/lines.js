import express from "express";
import { authenticate, getPositions } from "../controllers/linesController.js"

const router = express.Router();

router.post("/auth", async (_req, res) => {
  try {
    await authenticate();
    res.json({ authenticated: true });
  } catch {
    res.status(503).json({ message: "Autenticação SPTrans indisponível." });
  }
});
router.get("/positions", getPositions);

export default router;