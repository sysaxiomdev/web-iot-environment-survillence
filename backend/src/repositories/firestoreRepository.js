class FirestoreRepository {
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
      `${env.firestoreCollectionPrefix}_devices`,
    );
    this.readingsCollection = db.collection(
      `${env.firestoreCollectionPrefix}_readings`,
    );
    this.legacyCollection = db.collection(env.firestoreCollectionPrefix);
  }

  createReadingId(userId, nodeId, timestamp) {
    return `${userId || "global"}_${nodeId}_${timestamp.replace(/[:.]/g, "-")}`;
  }

  createDeviceDocId(userId, nodeId) {
    return `${userId || "global"}__${nodeId}`;
  }

  createGeneratedNodeId() {
    return this.devicesCollection.doc().id;
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

    if (typeof value?.toDate === "function") {
      return value.toDate().toISOString();
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
      humidityHigh: Number(reading.humidity) >= this.env.alertHumidityHigh,
      humidityLow: Number(reading.humidity) <= this.env.alertHumidityLow,
      stale:
        !reading.timestamp ||
        (Date.now() - new Date(reading.timestamp).getTime()) / 60000 >
          this.env.allowStaleReadingsMinutes,
    };
  }

  normalizeLegacyReading(userId, nodeId, payload) {
    const timestamp = this.normalizeTimestamp(payload.timestamp);
    const normalized = {
      id: this.createReadingId(
        userId,
        nodeId,
        timestamp || new Date(0).toISOString(),
      ),
      userId,
      nodeId,
      temperature: Number(payload.temperature),
      humidity: Number(payload.humidity),
      aqi: Number(payload.aqi),
      timestamp,
      serverTimestamp: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    normalized.alerts = this.buildAlerts(normalized);
    normalized.isAbnormal = Object.values(normalized.alerts).some(Boolean);
    return normalized;
  }

  buildLegacyDevice(reading) {
    return {
      userId: reading.userId,
      nodeId: reading.nodeId,
      name: reading.nodeId,
      location: "",
      notes: "",
      enabled: true,
      createdAt: reading.timestamp,
      updatedAt: reading.timestamp,
      lastSeenAt: reading.timestamp,
      latestReading: reading,
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

    const normalized = {
      ...reading,
      timestamp,
    };

    normalized.id =
      normalized.id ||
      this.createReadingId(
        normalized.userId,
        normalized.nodeId,
        normalized.timestamp,
      );
    normalized.createdAt =
      this.normalizeTimestamp(normalized.createdAt) || normalized.timestamp;
    normalized.updatedAt =
      this.normalizeTimestamp(normalized.updatedAt) || normalized.timestamp;
    normalized.serverTimestamp =
      this.normalizeTimestamp(normalized.serverTimestamp) || normalized.createdAt;
    normalized.alerts = normalized.alerts || this.buildAlerts(normalized);
    normalized.isAbnormal =
      typeof normalized.isAbnormal === "boolean"
        ? normalized.isAbnormal
        : Object.values(normalized.alerts).some(Boolean);

    return normalized;
  }

  matchesReadingFilters(reading, filters = {}) {
    if (filters.userId && reading.userId !== filters.userId) {
      return false;
    }

    if (filters.nodeId && reading.nodeId !== filters.nodeId) {
      return false;
    }

    if (filters.abnormal && !reading.isAbnormal) {
      return false;
    }

    if (filters.from && reading.timestamp < filters.from) {
      return false;
    }

    if (filters.to && reading.timestamp > filters.to) {
      return false;
    }

    return true;
  }

  async loadStoredReadings(filters = {}) {
    const requestedLimit =
      filters.limit === undefined
        ? this.env.maxHistoricalResults
        : Math.max(1, filters.limit);
    const hasNarrowFilters = Boolean(
      filters.userId ||
        filters.nodeId ||
        filters.abnormal ||
        filters.from ||
        filters.to,
    );
    const batchSize = Math.min(
      this.env.maxHistoricalResults,
      Math.max(requestedLimit, hasNarrowFilters ? 50 : requestedLimit),
    );
    const matches = [];
    let lastDoc = null;
    let scanned = 0;
    let reachedEnd = false;

    while (
      matches.length < requestedLimit &&
      scanned < this.env.maxHistoricalResults &&
      !reachedEnd
    ) {
      const currentBatchLimit = Math.min(
        batchSize,
        this.env.maxHistoricalResults - scanned,
      );
      let query = this.readingsCollection
        .orderBy("timestamp", "desc")
        .limit(currentBatchLimit);

      if (lastDoc) {
        query = query.startAfter(lastDoc);
      }

      const snapshot = await query.get();

      if (snapshot.empty) {
        break;
      }

      scanned += snapshot.size;
      lastDoc = snapshot.docs[snapshot.docs.length - 1];

      for (const doc of snapshot.docs) {
        const reading = this.normalizeStoredReading(doc.data());
        if (!reading) {
          continue;
        }

        if (filters.from && reading.timestamp < filters.from) {
          reachedEnd = true;
          continue;
        }

        if (this.matchesReadingFilters(reading, filters)) {
          matches.push(reading);
        }
      }

      if (snapshot.size < currentBatchLimit) {
        break;
      }
    }

    return matches.slice(0, requestedLimit);
  }

  mergeReadings(primaryReadings, secondaryReadings) {
    const byKey = new Map();

    for (const reading of [...secondaryReadings, ...primaryReadings]) {
      if (!reading?.nodeId || !reading?.timestamp) {
        continue;
      }

      const normalized = {
        ...reading,
        timestamp: this.normalizeTimestamp(reading.timestamp),
      };

      if (!normalized.timestamp) {
        continue;
      }

      normalized.id =
        normalized.id ||
        this.createReadingId(
          normalized.userId,
          normalized.nodeId,
          normalized.timestamp,
        );
      normalized.createdAt =
        this.normalizeTimestamp(normalized.createdAt) || normalized.timestamp;
      normalized.updatedAt =
        this.normalizeTimestamp(normalized.updatedAt) || normalized.timestamp;
      normalized.serverTimestamp =
        this.normalizeTimestamp(normalized.serverTimestamp) || normalized.createdAt;
      normalized.alerts = normalized.alerts || this.buildAlerts(normalized);
      normalized.isAbnormal =
        typeof normalized.isAbnormal === "boolean"
          ? normalized.isAbnormal
          : Object.values(normalized.alerts).some(Boolean);

      const key = `${normalized.nodeId}:${normalized.timestamp}`;
      byKey.set(key, normalized);
    }

    return Array.from(byKey.values()).sort((left, right) =>
      right.timestamp.localeCompare(left.timestamp),
    );
  }

  buildDevicesFromReadings(readings) {
    const byNode = new Map();

    for (const reading of readings) {
      const current = byNode.get(reading.nodeId);
      if (!current || current.lastSeenAt < reading.timestamp) {
        byNode.set(reading.nodeId, this.buildLegacyDevice(reading));
      }
    }

    return Array.from(byNode.values()).sort((left, right) =>
      String(right.lastSeenAt || "").localeCompare(String(left.lastSeenAt || "")),
    );
  }

  async getLegacyDocumentRef(userId) {
    if (userId) {
      return this.legacyCollection.doc(userId);
    }

    const snapshot = await this.legacyCollection.limit(1).get();
    if (!snapshot.empty) {
      return snapshot.docs[0].ref;
    }

    return this.legacyCollection.doc("default");
  }

  async loadLegacyReadings(userId) {
    const snapshots = userId
      ? [await this.legacyCollection.doc(userId).get()]
      : (await this.legacyCollection.get()).docs;

    return snapshots
      .filter((doc) => doc.exists)
      .flatMap((doc) =>
        Object.entries(doc.data())
          .filter(([, value]) => value && typeof value === "object")
          .map(([nodeId, value]) => this.normalizeLegacyReading(doc.id, nodeId, value)),
      )
      .filter((reading) => reading.timestamp)
      .sort((left, right) => right.timestamp.localeCompare(left.timestamp));
  }

  async listUsers() {
    const cached = this.getCachedValue("users");
    if (cached !== null) {
      return cached;
    }

    const legacySnapshot = await this.legacyCollection.get();
    if (!legacySnapshot.empty) {
      const users = legacySnapshot.docs.map((doc) => doc.id).sort();
      this.setCachedValue("users", users);
      return users;
    }

    const users = new Set();
    const devicesSnapshot = await this.devicesCollection.get();
    for (const doc of devicesSnapshot.docs) {
      const userId = doc.data().userId;
      if (userId) {
        users.add(userId);
      }
    }

    if (users.size === 0) {
      const readingsSnapshot = await this.readingsCollection.limit(200).get();
      for (const doc of readingsSnapshot.docs) {
        const userId = doc.data().userId;
        if (userId) {
          users.add(userId);
        }
      }
    }

    const result = Array.from(users).sort();
    this.setCachedValue("users", result);
    return result;
  }

  async saveReading(reading) {
    const nodeId = reading.nodeId || this.createGeneratedNodeId();
    const now = reading.serverTimestamp || new Date().toISOString();
    const readingId = this.createReadingId(
      reading.userId,
      nodeId,
      reading.timestamp,
    );
    const readingRef = this.readingsCollection.doc(readingId);
    const existing = await readingRef.get();
    const storedReading = {
      ...reading,
      nodeId,
      id: readingId,
      serverTimestamp: now,
      createdAt: existing.exists ? existing.data().createdAt : now,
      updatedAt: now,
    };

    await readingRef.set(storedReading, { merge: true });

    const deviceRef = this.devicesCollection.doc(
      this.createDeviceDocId(reading.userId, nodeId),
    );
    const deviceSnapshot = await deviceRef.get();
    const deviceData = deviceSnapshot.exists ? deviceSnapshot.data() : {};
    await deviceRef.set(
      {
        userId: reading.userId,
        nodeId,
        name: deviceData.name || nodeId,
        location: deviceData.location || "",
        notes: deviceData.notes || "",
        enabled: deviceData.enabled ?? true,
        createdAt: deviceData.createdAt || now,
        updatedAt: now,
        lastSeenAt: reading.timestamp,
        latestReading: storedReading,
      },
      { merge: true },
    );

    const legacyRef = await this.getLegacyDocumentRef(reading.userId);
    await legacyRef.set(
      {
        [nodeId]: {
          id: nodeId,
          temperature: reading.temperature,
          humidity: reading.humidity,
          aqi: reading.aqi,
          timestamp: new Date(reading.timestamp).getTime(),
        },
      },
      { merge: true },
    );

    this.invalidateCache("users");

    return {
      duplicate: existing.exists,
      reading: storedReading,
    };
  }

  async listDevices(filters = {}) {
    let query = this.devicesCollection;
    if (filters.userId) {
      query = query.where("userId", "==", filters.userId);
    }

    const snapshot = await query.get();
    if (snapshot.empty) {
      const legacyReadings = await this.loadLegacyReadings(filters.userId);
      const legacyDevices = this.buildDevicesFromReadings(legacyReadings);
      return legacyDevices;
    }

    const storedDevices = snapshot.docs.map((doc) => doc.data());

    if (!filters.userId) {
      return storedDevices.sort((left, right) =>
        String(right.lastSeenAt || "").localeCompare(String(left.lastSeenAt || "")),
      );
    }

    const legacyReadings = await this.loadLegacyReadings(filters.userId);
    if (legacyReadings.length === 0) {
      return storedDevices.sort((left, right) =>
        String(right.lastSeenAt || "").localeCompare(String(left.lastSeenAt || "")),
      );
    }

    const merged = new Map();
    const legacyDevices = this.buildDevicesFromReadings(legacyReadings);

    for (const device of [...legacyDevices, ...storedDevices]) {
      if (!device?.nodeId) {
        continue;
      }

      const existing = merged.get(device.nodeId);
      if (!existing) {
        merged.set(device.nodeId, device);
        continue;
      }

      const existingLastSeen = String(existing.lastSeenAt || "");
      const currentLastSeen = String(device.lastSeenAt || "");
      merged.set(
        device.nodeId,
        currentLastSeen >= existingLastSeen
          ? { ...existing, ...device }
          : { ...device, ...existing },
      );
    }

    return Array.from(merged.values()).sort((left, right) =>
      String(right.lastSeenAt || "").localeCompare(String(left.lastSeenAt || "")),
    );
  }

  async getDevice(nodeId, userId) {
    if (userId) {
      const scopedSnapshot = await this.devicesCollection
        .doc(this.createDeviceDocId(userId, nodeId))
        .get();
      if (scopedSnapshot.exists) {
        return scopedSnapshot.data();
      }
    } else {
      const directSnapshot = await this.devicesCollection.doc(nodeId).get();
      if (directSnapshot.exists) {
        return directSnapshot.data();
      }

      const byNodeSnapshot = await this.devicesCollection
        .where("nodeId", "==", nodeId)
        .limit(1)
        .get();
      if (!byNodeSnapshot.empty) {
        return byNodeSnapshot.docs[0].data();
      }
    }

    const legacyReadings = await this.loadLegacyReadings(userId);
    const reading = legacyReadings.find(
      (item) => item.nodeId === nodeId && (!userId || item.userId === userId),
    );
    return reading ? this.buildLegacyDevice(reading) : null;
  }

  async updateDevice(nodeId, patch, userId) {
    const ref = this.devicesCollection.doc(this.createDeviceDocId(userId, nodeId));
    const snapshot = await ref.get();
    if (!snapshot.exists) {
      const legacyDevice = await this.getDevice(nodeId, userId);
      if (!legacyDevice) {
        return null;
      }

      await ref.set(
        {
          ...legacyDevice,
          ...patch,
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );
      const createdFromLegacy = await ref.get();
      return createdFromLegacy.data();
    }

    await ref.set(
      {
        ...patch,
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );

    const updated = await ref.get();
    return updated.data();
  }

  async listReadings(filters = {}) {
    const requestedLimit =
      filters.limit === undefined ? this.env.maxHistoricalResults : Math.max(1, filters.limit);
    const storedReadings = await this.loadStoredReadings({
      ...filters,
      limit: requestedLimit,
    });

    if (!filters.userId || storedReadings.length >= requestedLimit) {
      return storedReadings.slice(0, requestedLimit);
    }

    const legacyReadings = (await this.loadLegacyReadings(filters.userId)).filter(
      (reading) => this.matchesReadingFilters(reading, filters),
    );

    return this.mergeReadings(storedReadings, legacyReadings).slice(
      0,
      requestedLimit,
    );
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

    const storedReading =
      (await this.listReadings({
        userId,
        nodeId,
        limit: 1,
      }))[0] || null;
    const legacyReading =
      (await this.loadLegacyReadings(userId)).find((item) => item.nodeId === nodeId) ||
      null;

    if (!storedReading) {
      return legacyReading;
    }

    if (!legacyReading) {
      return storedReading;
    }

    return this.mergeReadings([storedReading], [legacyReading])[0] || null;
  }
}

module.exports = { FirestoreRepository };
