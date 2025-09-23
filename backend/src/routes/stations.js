import express from "express";
import {getRoute} from "../controllers/stationsController.js";

const router = express.Router();

// GET /stations/route - Retorna rota entre dois pontos usando GraphHopper
router.get("/route", getRoute);

export default router;