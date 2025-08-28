import sequelize from "./client.js";

async function testConnection() {
  try {
  await sequelize.authenticate();
  console.log("✅ Database connection established successfully!");
  } catch (error) {
  console.error("❌ Unable to connect to the database:", error);
  }
}

testConnection();
