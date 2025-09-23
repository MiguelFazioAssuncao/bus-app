import express from "express";
import {setHome, setWork} from "../controllers/directionsController.js";

const router = express.Router();

// POST /directions/setHome - Define endereço de casa
router.post("/setHome", setHome);
// POST /directions/setWork - Define endereço de trabalho
router.post("/setWork", setWork);

export default router;