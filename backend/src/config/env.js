const fs = require("fs");
const path = require("path");

let dotenv = null;

try {
  dotenv = require("dotenv");
} catch (error) {
  dotenv = null;
}

const envCandidates = [
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "backend", ".env"),
];

for (const candidate of envCandidates) {
  if (dotenv && fs.existsSync(candidate)) {
    dotenv.config({ path: candidate, override: false });
  }
}

function readNumber(name, fallback) {
  const value = process.env[name];
  if (value === undefined || value === "") {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readOrigins(name, fallback) {
  const value = process.env[name];
  if (!value) {
    return fallback;
  }

  const origins = value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return origins.length > 0 ? origins : fallback;
}

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: readNumber("PORT", 4000),
  frontendOrigins: readOrigins("FRONTEND_ORIGIN", ["http://localhost:5173"]),
  jwtSecret: process.env.JWT_SECRET || "replace-with-a-long-random-secret",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "12h",
  seedAdminUsername: process.env.BOOTSTRAP_LOGIN_EMAIL || "",
  seedAdminPassword: process.env.BOOTSTRAP_LOGIN_PASSWORD || "",
  storageProvider:
    process.env.STORAGE_PROVIDER ||
    (process.env.MONGO_URI ? "mongodb" : "memory"),
  mongoUri: process.env.MONGO_URI || "",
  mongoDbName: process.env.MONGO_DB_NAME || "environmental_surveillance",
  mongoCollectionPrefix:
    process.env.MONGO_COLLECTION_PREFIX || "environmental_surveillance",
  activeDeviceWindowMinutes: readNumber("ACTIVE_DEVICE_WINDOW_MINUTES", 30),
  maxHistoricalResults: readNumber("MAX_HISTORICAL_RESULTS", 500),
  allowStaleReadingsMinutes: readNumber("ALLOW_STALE_READINGS_MINUTES", 10080),
  alertAqiThreshold: readNumber("ALERT_AQI_THRESHOLD", 100),
  alertTemperatureHigh: readNumber("ALERT_TEMPERATURE_HIGH", 40),
  alertTemperatureLow: readNumber("ALERT_TEMPERATURE_LOW", 0),
  alertHumidityHigh: readNumber("ALERT_HUMIDITY_HIGH", 80),
  alertHumidityLow: readNumber("ALERT_HUMIDITY_LOW", 20),
};

module.exports = { env };
