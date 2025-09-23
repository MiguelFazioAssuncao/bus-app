
import User from "../models/User.js"; // Importa o modelo de usuário
import bcrypt from "bcrypt" // Importa biblioteca para hash de senha
import jwt from "jsonwebtoken"; // Importa biblioteca para geração de token JWT

const JWT_SECRET = process.env.JWT_SECRET || "default_secret"; // Chave secreta do JWT

// Função para registrar novo usuário
export const register = async (req, res) => {
    const { name, email, password } = req.body // Extrai dados do corpo da requisição

    try {
        const existingUser = await User.findOne({where: { email }}); // Verifica se já existe usuário com o email
        if (existingUser) {
            return res.status(400).json({ message: "User already exists" }); // Retorna erro se já existe
        };

        const hashedPassword = await bcrypt.hash(password, 10) // Gera hash da senha

        const user = await User.create({ // Cria novo usuário no banco
            name,
            email,
            password: hashedPassword
        });

        res.status(201).json({ message: "User created successfully", user }); // Retorna sucesso e dados do usuário
    } catch (err) {
        res.status(500).json({ message: "Internal server error", error: err.message }); // Retorna erro interno
    }
};

// Função para login de usuário
export const login = async (req, res) => {
    const { email, password } = req.body; // Extrai dados do corpo da requisição

    try {
        const user = await User.findOne({ where: { email } }); // Busca usuário pelo email
        if (!user) {
            return res.status(404).json({ message: "User not found" }); // Retorna erro se não encontrar
        }

        const isMatch = await bcrypt.compare(password, user.password); // Compara senha informada com hash
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials" }); // Retorna erro se senha inválida
        }

        const token = jwt.sign( // Gera token JWT
            { id: user.id, email: user.email }, // Payload do token
            JWT_SECRET, // Chave secreta
            { expiresIn: "1h" } // Tempo de expiração
        );

        res.json({ message: "Login successful", token }); // Retorna sucesso e token
    } catch (err) {
        res.status(500).json({ message: "Internal server error", error: err.message }); // Retorna erro interno
    }
};