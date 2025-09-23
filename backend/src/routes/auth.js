import express from "express";
import { register, login } from "../controllers/authController.js";

const router = express.Router();

// POST /auth/register - Cadastro de novo usuário
router.post("/register", register);
// POST /auth/login - Login de usuário
router.post("/login", login);

export default router;