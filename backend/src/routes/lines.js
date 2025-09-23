import express from "express";
import { authenticate, getPositions } from "../controllers/linesController.js"

const router = express.Router();

// POST /lines/auth - Autentica na API externa de linhas
router.post("/auth", authenticate);
// GET /lines/positions - Retorna posições dos veículos nas linhas
router.get("/positions", getPositions);

export default router;