const { ensureWebCrypto } = require("../utils/webcrypto");

ensureWebCrypto();

const { ObjectId } = require("mongodb");

class MongoRepository {
  constructor(db, env) {
    this.db = db;
    this.env = env;
    this.cacheTtlMs = 30000;
    this.cache = {
      users: {
        value: null,
        expiresAt: 0,
      },
    };
    this.devicesCollection = db.collection(
      `${env.mongoCollectionPrefix}_devices`,
    );
    this.readingsCollection = db.collection(
      `${env.mongoCollectionPrefix}_readings`,
    );
    this.adminCollection = db.collection("admin");
  }

  createReadingId(userId, nodeId, timestamp) {
    return `${userId || "global"}_${nodeId}_${timestamp.replace(/[:.]/g, "-")}`;
  }

  createDeviceDocId(userId, nodeId) {
    return `${userId || "global"}__${nodeId}`;
  }

  createGeneratedNodeId() {
    return new ObjectId().toHexString();
  }

  getCachedValue(key) {
    const entry = this.cache[key];
    if (!entry || entry.expiresAt <= Date.now()) {
      return null;
    }

    return entry.value;
  }

  setCachedValue(key, value, ttlMs = this.cacheTtlMs) {
    this.cache[key] = {
      value,
      expiresAt: Date.now() + ttlMs,
    };
  }

  invalidateCache(key) {
    if (!this.cache[key]) {
      return;
    }

    this.cache[key] = {
      value: null,
      expiresAt: 0,
    };
  }

  normalizeTimestamp(value) {
    if (!value) {
      return null;
    }

    if (typeof value === "number") {
      return new Date(value).toISOString();
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }

  buildAlerts(reading) {
    return {
      aqi: Number(reading.aqi) >= this.env.alertAqiThreshold,
      temperatureHigh:
        Number(reading.temperature) >= this.env.alertTemperatureHigh,
      temperatureLow:
        Number(reading.temperature) <= this.env.alertTemperatureLow,
      humidityHigh:
        Number(reading.humidity) >= this.env.alertHumidityHigh,
      humidityLow:
        Number(reading.humidity) <= this.env.alertHumidityLow,
      stale:
        !reading.timestamp ||
        (Date.now() - new Date(reading.timestamp).getTime()) / 60000 >
          this.env.allowStaleReadingsMinutes,
    };
  }

  normalizeStoredReading(reading) {
    if (!reading?.nodeId || !reading?.timestamp) {
      return null;
    }

    const timestamp = this.normalizeTimestamp(reading.timestamp);
    if (!timestamp) {
      return null;
    }

    const serverTimestamp =
      this.normalizeTimestamp(reading.serverTimestamp) ||
      this.normalizeTimestamp(reading.createdAt) ||
      this.normalizeTimestamp(reading.updatedAt) ||
      timestamp;

    const normalized = {
      id: reading.id || String(reading._id || ""),
      userId: reading.userId || undefined,
      nodeId: reading.nodeId,
      temperature: Number(reading.temperature),
      humidity: Number(reading.humidity),
      aqi: Number(reading.aqi),
      timestamp,
      serverTimestamp,
      createdAt: this.normalizeTimestamp(reading.createdAt) || serverTimestamp,
      updatedAt: this.normalizeTimestamp(reading.updatedAt) || serverTimestamp,
      alerts: reading.alerts || {},
      isAbnormal:
        typeof reading.isAbnormal === "boolean"
          ? reading.isAbnormal
          : false,
    };

    normalized.alerts = normalized.alerts || this.buildAlerts(normalized);
    normalized.isAbnormal =
      typeof normalized.isAbnormal === "boolean"
        ? normalized.isAbnormal
        : Object.values(normalized.alerts).some(Boolean);

    return normalized;
  }

  async listUsers() {
    const cached = this.getCachedValue("users");
    if (cached) {
      return cached;
    }

    const users = await this.devicesCollection.distinct("userId", {
      userId: { $exists: true },
    });

    const sorted = users.filter(Boolean).sort();
    this.setCachedValue("users", sorted);
    return sorted;
  }

  async countAdmins() {
    return this.adminCollection.countDocuments({
      enabled: { $ne: false },
    });
  }

  async findAdminByUsername(username) {
    if (!username) {
      return null;
    }

    return (
      (await this.adminCollection.findOne({
        username,
        enabled: { $ne: false },
      })) || null
    );
  }

  async upsertAdmin(admin) {
    const now = new Date().toISOString();
    const username = String(admin.username || "").trim();
    const password = String(admin.password || "");

    if (!username || !password) {
      throw new Error("Admin username and password are required");
    }

    const record = {
      username,
      password,
      role: admin.role || "admin",
      enabled: admin.enabled !== false,
      updatedAt: now,
    };

    await this.adminCollection.updateOne(
      { username },
      {
        $set: record,
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true },
    );

    return this.findAdminByUsername(username);
  }

  async saveReading(reading) {
    const nodeId = reading.nodeId || this.createGeneratedNodeId();
    const serverTimestamp = reading.serverTimestamp || new Date().toISOString();
    const readingId = this.createReadingId(
      reading.userId,
      nodeId,
      reading.timestamp,
    );

    const storedReading = {
      ...reading,
      id: readingId,
      nodeId,
      serverTimestamp,
      createdAt: reading.createdAt || serverTimestamp,
      updatedAt: serverTimestamp,
      alerts: reading.alerts || this.buildAlerts(reading),
      isAbnormal:
        typeof reading.isAbnormal === "boolean"
          ? reading.isAbnormal
          : Object.values(reading.alerts || this.buildAlerts(reading)).some(
              Boolean,
            ),
    };

    const result = await this.readingsCollection.updateOne(
      { id: readingId },
      { $set: storedReading },
      { upsert: true },
    );

    const deviceKey = this.createDeviceDocId(reading.userId, nodeId);
    const currentDevice = await this.devicesCollection.findOne({ id: deviceKey });
    const updatedDevice = {
      ...(currentDevice || {
        userId: reading.userId,
        nodeId,
        name: nodeId,
        location: "",
        notes: "",
        enabled: true,
        createdAt: serverTimestamp,
      }),
      lastSeenAt: reading.timestamp,
      latestReading: storedReading,
      updatedAt: serverTimestamp,
      id: deviceKey,
    };

    await this.devicesCollection.updateOne(
      { id: deviceKey },
      { $set: updatedDevice },
      { upsert: true },
    );

    this.invalidateCache("users");

    return {
      duplicate: result.matchedCount > 0,
      reading: storedReading,
    };
  }

  async listDevices(filters = {}) {
    const query = {};
    if (filters.userId) {
      query.userId = filters.userId;
    }

    const devices = await this.devicesCollection
      .find(query)
      .sort({ lastSeenAt: -1 })
      .toArray();

    return devices;
  }

  async getDevice(nodeId, userId) {
    if (userId) {
      return (
        await this.devicesCollection.findOne({
          id: this.createDeviceDocId(userId, nodeId),
        })
      ) || null;
    }

    return (
      (await this.devicesCollection.findOne({ nodeId })) || null
    );
  }

  async updateDevice(nodeId, patch, userId) {
    const id = this.createDeviceDocId(userId, nodeId);
    const result = await this.devicesCollection.findOneAndUpdate(
      { id },
      {
        $set: {
          ...patch,
          updatedAt: new Date().toISOString(),
        },
      },
      { returnDocument: "after" },
    );

    return result.value || null;
  }

  async listReadings(filters = {}) {
    const requestedLimit =
      filters.limit === undefined ? this.env.maxHistoricalResults : Math.max(1, filters.limit);
    const query = {};

    if (filters.userId) {
      query.userId = filters.userId;
    }

    if (filters.nodeId) {
      query.nodeId = filters.nodeId;
    }

    if (filters.abnormal) {
      query.isAbnormal = true;
    }

    if (filters.from || filters.to) {
      query.timestamp = {};
      if (filters.from) {
        query.timestamp.$gte = filters.from;
      }
      if (filters.to) {
        query.timestamp.$lte = filters.to;
      }
    }

    const readings = await this.readingsCollection
      .find(query)
      .sort({ timestamp: -1 })
      .limit(requestedLimit)
      .toArray();

    return readings
      .map((reading) => this.normalizeStoredReading(reading))
      .filter(Boolean);
  }

  async getLatestReadings(filters = {}) {
    const devices = await this.listDevices(filters);
    return devices
      .map((device) => device.latestReading)
      .filter(Boolean)
      .sort((left, right) => right.timestamp.localeCompare(left.timestamp));
  }

  async getLatestReadingForDevice(nodeId, userId) {
    const device = await this.getDevice(nodeId, userId);
    if (device?.latestReading) {
      return device.latestReading;
    }

    const reading =
      (await this.listReadings({
        userId,
        nodeId,
        limit: 1,
      }))[0] || null;

    return reading;
  }
}

module.exports = { MongoRepository };
