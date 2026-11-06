import express from "express";
import {
  authenticate,
  getPositions,
  getLinePredictions,
  getStops,
  searchLinesCatalog,
} from "../controllers/linesController.js";

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
router.get("/stops", getStops);
router.get("/search", searchLinesCatalog);
router.get("/:cl/predictions", getLinePredictions);

export default router;