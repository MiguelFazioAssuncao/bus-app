import User from "../models/User.js";
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "default_secret";

export const register = async (req, res) => {
    const { name, email, password } = req.body

    try {
        const existingUser = await User.findOne({where: { email }});
        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        };

        const hashedPassword = await bcrypt.hash(password, 10)

        const user = await User.create({
            name,
            email,
            password: hashedPassword
        });

        const safeUser = { id: user.id, name: user.name, email: user.email };
        res.status(201).json({ message: "User created successfully", user: safeUser });
    } catch (err) {
        res.status(500).json({ message: "Internal server error", error: err.message });
    }
};

export const login = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email },
            JWT_SECRET,
            { expiresIn: "1h" }
        );

        const safeUser = { id: user.id, name: user.name, email: user.email };
        res.json({ message: "Login successful", token, user: safeUser }); 
    } catch (err) {
        res.status(500).json({ message: "Internal server error", error: err.message });
    }
};

export const me = async (req, res) => {
    try {
        const authHeader = req.headers.authorization || '';
        const parts = authHeader.split(' ');
        if (parts.length !== 2 || parts[0] !== 'Bearer') {
            return res.status(401).json({ message: 'Missing or invalid Authorization header' });
        }
        const token = parts[1];

        let payload;
        try {
            payload = jwt.verify(token, JWT_SECRET);
        } catch (e) {
            return res.status(401).json({ message: 'Invalid or expired token' });
        }

        const user = await User.findOne({ where: { id: payload.id } });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const safeUser = { id: user.id, name: user.name, email: user.email };
        res.json({ user: safeUser });
    } catch (err) {
        res.status(500).json({ message: 'Internal server error', error: err.message });
    }
};