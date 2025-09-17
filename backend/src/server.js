import express from 'express';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import linesRoutes from './routes/lines.js';
import stationsRoutes from './routes/stations.js';

dotenv.config();

const app = express();
app.use(express.json());

app.use("/auth", authRoutes)
app.use("/lines", linesRoutes)
app.use("/stations", stationsRoutes)

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});