import "dotenv/config";
import express from "express";
import cors from "cors";
import sequelize from "./database/client.js";
import authRoutes from "./routes/auth.js";
import linesRoutes from "./routes/lines.js";
import stationsRoutes from "./routes/stations.js";
import directionsRoutes from "./routes/directions.js";

if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET must be configured in production");
}
const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "100kb" }));
app.use(cors(process.env.CORS_ORIGIN ? { origin: process.env.CORS_ORIGIN.split(",") } : {}));
app.get("/health", async (_req, res) => {
  try {
    await sequelize.authenticate();
    res.json({ status: "ok", database: "connected" });
  } catch {
    res.status(503).json({ status: "unavailable", database: "disconnected" });
  }
});
app.use("/auth", authRoutes);
app.use("/lines", linesRoutes);
app.use("/stations", stationsRoutes);
app.use("/directions", directionsRoutes);

try {
  await sequelize.authenticate();
  // Creates missing tables after all models are registered, without altering existing data.
  await sequelize.sync();
  const server = app.listen(process.env.PORT || 3000, "0.0.0.0", () => {
    console.log(`Server is running on port ${process.env.PORT || 3000}`);
  });
  for (const signal of ["SIGTERM", "SIGINT"]) {
    process.once(signal, () => {
      server.close(async () => {
        await sequelize.close();
        process.exit(0);
      });
      setTimeout(() => process.exit(1), 10000).unref();
    });
  }
} catch (error) {
  console.error("Database startup failed:", error.name);
  await sequelize.close();
  process.exitCode = 1;
}
