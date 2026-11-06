import express from "express";
import { getRoute, geocodeAddress, reverseGeocode } from "../controllers/stationsController.js";

const router = express.Router();

router.get("/route", getRoute);
router.get("/geocode", geocodeAddress);
router.get("/reverse", reverseGeocode);

export default router;