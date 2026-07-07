const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const { ensureWebCrypto } = require("./utils/webcrypto");

ensureWebCrypto();

const { MongoClient } = require("mongodb");

const envCandidates = [
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "backend", ".env"),
];

for (const envPath of envCandidates) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: false });
  }
}

const mongoUri = process.env.MONGO_URI;
const mongoDbName = process.env.MONGO_DB_NAME || "environmental_surveillance";
const prefix = process.env.MONGO_COLLECTION_PREFIX || "environmental_surveillance";

if (!mongoUri) {
  console.error("MONGO_URI is not configured in .env");
  process.exit(1);
}

const devicesCollectionName = `${prefix}_devices`;
const readingsCollectionName = `${prefix}_readings`;

async function seed() {
  const client = new MongoClient(mongoUri);
  await client.connect();

  try {
    const db = client.db(mongoDbName);
    const devices = db.collection(devicesCollectionName);
    const readings = db.collection(readingsCollectionName);

    console.log("Clearing existing seed data...");
    const seededUserIds = [
      "raspberry_pi_1",
      "raspberry_pi_2",
      "sysaxiomdev_db_user",
      "field_ops_user",
    ];

    await Promise.all([
      devices.deleteMany({ userId: { $in: seededUserIds } }),
      readings.deleteMany({ userId: { $in: seededUserIds } }),
    ]);

    const now = new Date();
    const sampleDevice = {
      id: "raspberry_pi_1__node_1",
      userId: "raspberry_pi_1",
      nodeId: "node_1",
      name: "Demo Sensor Node",
      location: "Main Warehouse",
      notes: "Seeded device for development",
      enabled: true,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      lastSeenAt: now.toISOString(),
      latestReading: null,
    };

    const fieldOpsDevice = {
      id: "raspberry_pi_2__node_2",
      userId: "raspberry_pi_2",
      nodeId: "node_2",
      name: "Field Air Quality Node",
      location: "North Perimeter",
      notes: "Seeded device for today's field readings",
      enabled: true,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      lastSeenAt: now.toISOString(),
      latestReading: null,
    };

    const sampleReadings = [
      {
        id: "raspberry_pi_1_node_1_1",
        userId: "raspberry_pi_1",
        nodeId: "node_1",
        temperature: 22.6,
        humidity: 51.2,
        aqi: 42,
        timestamp: new Date(now.getTime() - 1000 * 60 * 5).toISOString(),
        serverTimestamp: now.toISOString(),
        createdAt: new Date(now.getTime() - 1000 * 60 * 5).toISOString(),
        updatedAt: new Date(now.getTime() - 1000 * 60 * 5).toISOString(),
        alerts: {
          aqi: false,
          temperatureHigh: false,
          temperatureLow: false,
          humidityHigh: false,
          humidityLow: false,
          stale: false,
        },
        isAbnormal: false,
      },
      {
        id: "raspberry_pi_1_node_1_2",
        userId: "raspberry_pi_1",
        nodeId: "node_1",
        temperature: 24.1,
        humidity: 48.9,
        aqi: 58,
        timestamp: new Date(now.getTime() - 1000 * 60 * 4).toISOString(),
        serverTimestamp: now.toISOString(),
        createdAt: new Date(now.getTime() - 1000 * 60 * 4).toISOString(),
        updatedAt: new Date(now.getTime() - 1000 * 60 * 4).toISOString(),
        alerts: {
          aqi: false,
          temperatureHigh: false,
          temperatureLow: false,
          humidityHigh: false,
          humidityLow: false,
          stale: false,
        },
        isAbnormal: false,
      },
      {
        id: "raspberry_pi_1_node_1_3",
        userId: "raspberry_pi_1",
        nodeId: "node_1",
        temperature: 39.8,
        humidity: 83.5,
        aqi: 120,
        timestamp: new Date(now.getTime() - 1000 * 60 * 3).toISOString(),
        serverTimestamp: now.toISOString(),
        createdAt: new Date(now.getTime() - 1000 * 60 * 3).toISOString(),
        updatedAt: new Date(now.getTime() - 1000 * 60 * 3).toISOString(),
        alerts: {
          aqi: true,
          temperatureHigh: false,
          temperatureLow: false,
          humidityHigh: true,
          humidityLow: false,
          stale: false,
        },
        isAbnormal: true,
      },
      {
        id: "raspberry_pi_1_node_1_4",
        userId: "raspberry_pi_1",
        nodeId: "node_1",
        temperature: 18.4,
        humidity: 26.1,
        aqi: 35,
        timestamp: new Date(now.getTime() - 1000 * 60 * 2).toISOString(),
        serverTimestamp: now.toISOString(),
        createdAt: new Date(now.getTime() - 1000 * 60 * 2).toISOString(),
        updatedAt: new Date(now.getTime() - 1000 * 60 * 2).toISOString(),
        alerts: {
          aqi: false,
          temperatureHigh: false,
          temperatureLow: false,
          humidityHigh: false,
          humidityLow: false,
          stale: false,
        },
        isAbnormal: false,
      },
      {
        id: "raspberry_pi_1_node_1_5",
        userId: "raspberry_pi_1",
        nodeId: "node_1",
        temperature: 22.0,
        humidity: 50.0,
        aqi: 40,
        timestamp: new Date(now.getTime() - 1000 * 60 * 1).toISOString(),
        serverTimestamp: now.toISOString(),
        createdAt: new Date(now.getTime() - 1000 * 60 * 1).toISOString(),
        updatedAt: new Date(now.getTime() - 1000 * 60 * 1).toISOString(),
        alerts: {
          aqi: false,
          temperatureHigh: false,
          temperatureLow: false,
          humidityHigh: false,
          humidityLow: false,
          stale: false,
        },
        isAbnormal: false,
      },
    ];

    const fieldOpsReadings = [
      {
        id: "raspberry_pi_2_node_2_1",
        userId: "raspberry_pi_2",
        nodeId: "node_2",
        temperature: 25.4,
        humidity: 55.8,
        aqi: 61,
        timestamp: new Date(now.getTime() - 1000 * 60 * 55).toISOString(),
        serverTimestamp: now.toISOString(),
        createdAt: new Date(now.getTime() - 1000 * 60 * 55).toISOString(),
        updatedAt: new Date(now.getTime() - 1000 * 60 * 55).toISOString(),
        alerts: {
          aqi: false,
          temperatureHigh: false,
          temperatureLow: false,
          humidityHigh: false,
          humidityLow: false,
          stale: false,
        },
        isAbnormal: false,
      },
      {
        id: "raspberry_pi_2_node_2_2",
        userId: "raspberry_pi_2",
        nodeId: "node_2",
        temperature: 27.2,
        humidity: 59.4,
        aqi: 72,
        timestamp: new Date(now.getTime() - 1000 * 60 * 40).toISOString(),
        serverTimestamp: now.toISOString(),
        createdAt: new Date(now.getTime() - 1000 * 60 * 40).toISOString(),
        updatedAt: new Date(now.getTime() - 1000 * 60 * 40).toISOString(),
        alerts: {
          aqi: false,
          temperatureHigh: false,
          temperatureLow: false,
          humidityHigh: false,
          humidityLow: false,
          stale: false,
        },
        isAbnormal: false,
      },
      {
        id: "raspberry_pi_2_node_2_3",
        userId: "raspberry_pi_2",
        nodeId: "node_2",
        temperature: 41.3,
        humidity: 63.1,
        aqi: 116,
        timestamp: new Date(now.getTime() - 1000 * 60 * 25).toISOString(),
        serverTimestamp: now.toISOString(),
        createdAt: new Date(now.getTime() - 1000 * 60 * 25).toISOString(),
        updatedAt: new Date(now.getTime() - 1000 * 60 * 25).toISOString(),
        alerts: {
          aqi: true,
          temperatureHigh: true,
          temperatureLow: false,
          humidityHigh: false,
          humidityLow: false,
          stale: false,
        },
        isAbnormal: true,
      },
      {
        id: "raspberry_pi_2_node_2_4",
        userId: "raspberry_pi_2",
        nodeId: "node_2",
        temperature: 28.0,
        humidity: 57.7,
        aqi: 69,
        timestamp: new Date(now.getTime() - 1000 * 60 * 10).toISOString(),
        serverTimestamp: now.toISOString(),
        createdAt: new Date(now.getTime() - 1000 * 60 * 10).toISOString(),
        updatedAt: new Date(now.getTime() - 1000 * 60 * 10).toISOString(),
        alerts: {
          aqi: false,
          temperatureHigh: false,
          temperatureLow: false,
          humidityHigh: false,
          humidityLow: false,
          stale: false,
        },
        isAbnormal: false,
      },
    ];

    sampleDevice.latestReading = sampleReadings[sampleReadings.length - 1];
    fieldOpsDevice.latestReading = fieldOpsReadings[fieldOpsReadings.length - 1];
    fieldOpsDevice.lastSeenAt = fieldOpsDevice.latestReading.timestamp;

    console.log("Seeding devices...");
    await Promise.all(
      [sampleDevice, fieldOpsDevice].map((device) =>
        devices.updateOne(
          { id: device.id },
          { $set: device },
          { upsert: true },
        ),
      ),
    );

    console.log("Seeding readings...");
    const allReadings = [...sampleReadings, ...fieldOpsReadings];
    await readings.deleteMany({ id: { $in: allReadings.map((item) => item.id) } });
    await readings.insertMany(allReadings);

    console.log("Seed complete.");
  } finally {
    await client.close();
  }
}

seed().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
