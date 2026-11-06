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

function normalizeOrigin(origin = "") {
  return String(origin).trim().replace(/\/+$/, "");
}

export function isAllowedOrigin(origin, configuredOrigins = process.env.CORS_ORIGIN) {
  if (!origin) return true;
  if (!configuredOrigins || !configuredOrigins.trim()) return true;
  const normalized = normalizeOrigin(origin);
  const allowedList = configuredOrigins
    .split(",")
    .map(normalizeOrigin)
    .filter(Boolean);
  if (allowedList.includes("*") || allowedList.includes(normalized)) {
    return true;
  }
  // Allow Vercel preview/branch deployments and localhost development
  if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(normalized)) {
    return true;
  }
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(normalized)) {
    return true;
  }
  return false;
}

export const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "250kb" }));
app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
  }),
);

let dbReady = false;

async function ensureDatabaseReady() {
  if (dbReady) return true;
  await sequelize.authenticate();
  await sequelize.sync();
  dbReady = true;
  return true;
}

app.get(["/health", "/api/health"], async (_req, res) => {
  try {
    await ensureDatabaseReady();
    res.json({
      status: "ok",
      database: "connected",
      sptransConfigured: Boolean(process.env.TOKEN_LINE?.trim()),
      routingConfigured: true,
    });
  } catch {
    res.status(503).json({
      status: "degraded",
      database: "disconnected",
      sptransConfigured: Boolean(process.env.TOKEN_LINE?.trim()),
      routingConfigured: true,
    });
  }
});

app.use(["/auth", "/api/auth"], authRoutes);
app.use(["/lines", "/api/lines"], linesRoutes);
app.use(["/stations", "/api/stations"], stationsRoutes);
app.use(["/directions", "/api/directions"], directionsRoutes);

if (process.env.NODE_ENV !== "test") {
  const port = Number(process.env.PORT || 3000);
  const server = app.listen(port, "0.0.0.0", () => {
    console.log(`Server is running on port ${port}`);
  });

  (async () => {
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      try {
        await ensureDatabaseReady();
        console.log("Database connected and synchronized.");
        break;
      } catch (error) {
        console.error(`Database connection attempt ${attempt}/5 failed:`, error.name);
        if (attempt < 5) {
          await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
        }
      }
    }
  })();

  for (const signal of ["SIGTERM", "SIGINT"]) {
    process.once(signal, () => {
      server.close(async () => {
        try {
          await sequelize.close();
        } catch {
          // Ignore close errors during shutdown
        }
        process.exit(0);
      });
      setTimeout(() => process.exit(1), 10000).unref();
    });
  }
}
