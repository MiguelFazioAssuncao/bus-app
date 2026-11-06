import "dotenv/config";
import { Sequelize } from "sequelize";

const databaseUrl = process.env.DATABASE_URL?.trim() || "";
const useSsl =
  process.env.DB_SSL === "true" ||
  /sslmode=(require|verify-full|verify-ca)/i.test(databaseUrl) ||
  /\.(neon\.tech|supabase\.co|railway\.app)/i.test(databaseUrl);
const rejectUnauthorized = process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false";

const options = {
  dialect: "postgres",
  logging: false,
  pool: { max: 5, min: 0, acquire: 30000, idle: 10000 },
  // External managed PostgreSQL uses TLS; Render internal connections do not.
  ...(useSsl
    ? {
        dialectOptions: {
          ssl: { require: true, rejectUnauthorized },
        },
      }
    : {}),
};

const sequelize = databaseUrl
  ? new Sequelize(databaseUrl, options)
  : new Sequelize(
      process.env.DB_NAME || "bus_app_sa",
      process.env.DB_USER || "postgres",
      process.env.DB_PASSWORD || "postgres",
      { ...options, host: process.env.DB_HOST || "127.0.0.1", port: Number(process.env.DB_PORT || 5432) },
    );

export default sequelize;
