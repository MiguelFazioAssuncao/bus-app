import express from "express";
import {setHome, setWork, getPreferences} from "../controllers/directionsController.js";

const router = express.Router();

router.post("/setHome", setHome);
router.post("/setWork", setWork);
router.get("/preferences", getPreferences);

export default router;