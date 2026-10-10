import "dotenv/config";
import { Sequelize } from "sequelize";

const options = {
  dialect: "postgres",
  logging: false,
  pool: { max: 5, min: 0, acquire: 30000, idle: 10000 },
  // External managed PostgreSQL uses TLS; Render internal connections do not.
  ...(process.env.DB_SSL === "true" ? {
    dialectOptions: { ssl: { require: true, rejectUnauthorized: true } },
  } : {}),
};

const sequelize = process.env.DATABASE_URL
  ? new Sequelize(process.env.DATABASE_URL, options)
  : new Sequelize(
      process.env.DB_NAME || "bus_app_sa",
      process.env.DB_USER || "postgres",
      process.env.DB_PASSWORD || "postgres",
      { ...options, host: process.env.DB_HOST || "127.0.0.1", port: Number(process.env.DB_PORT || 5432) },
    );

export default sequelize;
