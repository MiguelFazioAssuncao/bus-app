import sequelize from "./client.js";
try {
  await sequelize.authenticate();
  console.log("Database connection established successfully");
} catch (error) {
  console.error("Unable to connect to the database:", error.name);
  process.exitCode = 1;
} finally {
  await sequelize.close();
}
