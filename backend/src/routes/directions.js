import express from "express";
import {setHome} from "../controllers/directionsController.js";

const router = express.Router();


router.post("/setHome", setHome);

export default router;