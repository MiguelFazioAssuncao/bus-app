import express from "express";
import { authenticate, getPositions } from "../controllers/linesController.js"

const router = express.Router();

router.post("/auth", authenticate);
router.get("/positions", getPositions);

export default router;