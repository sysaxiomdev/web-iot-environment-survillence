class MemoryRepository {
  constructor() {
    this.devices = new Map();
    this.readings = new Map();
  }

  createGeneratedNodeId() {
    return `node_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  }

  createScopedKey(userId, nodeId) {
    return `${userId || "global"}:${nodeId}`;
  }

  createReadingId(userId, nodeId, timestamp) {
    return `${userId || "global"}_${nodeId}_${timestamp.replace(/[:.]/g, "-")}`;
  }

  async listUsers() {
    const users = new Set();

    for (const device of this.devices.values()) {
      if (device.userId) {
        users.add(device.userId);
      }
    }

    for (const reading of this.readings.values()) {
      if (reading.userId) {
        users.add(reading.userId);
      }
    }

    return Array.from(users).sort();
  }

  async saveReading(reading) {
    const nodeId = reading.nodeId || this.createGeneratedNodeId();
    const serverTimestamp = reading.serverTimestamp || new Date().toISOString();
    const readingId = this.createReadingId(
      reading.userId,
      nodeId,
      reading.timestamp,
    );
    const existing = this.readings.get(readingId);
    const storedReading = {
      ...existing,
      ...reading,
      nodeId,
      id: readingId,
      serverTimestamp,
      createdAt: existing?.createdAt || serverTimestamp,
      updatedAt: serverTimestamp,
    };

    this.readings.set(readingId, storedReading);

    const deviceKey = this.createScopedKey(reading.userId, nodeId);
    const currentDevice = this.devices.get(deviceKey) || {
      userId: reading.userId,
      nodeId,
      name: nodeId,
      location: "",
      notes: "",
      enabled: true,
      createdAt: serverTimestamp,
    };

    const updatedDevice = {
      ...currentDevice,
      lastSeenAt: reading.timestamp,
      latestReading: storedReading,
      updatedAt: serverTimestamp,
    };

    this.devices.set(deviceKey, updatedDevice);

    return {
      duplicate: Boolean(existing),
      reading: storedReading,
    };
  }

  async listDevices(filters = {}) {
    let devices = Array.from(this.devices.values());

    if (filters.userId) {
      devices = devices.filter((device) => device.userId === filters.userId);
    }

    return devices.sort((left, right) =>
      String(right.lastSeenAt || "").localeCompare(String(left.lastSeenAt || "")),
    );
  }

  async getDevice(nodeId, userId) {
    if (userId) {
      return this.devices.get(this.createScopedKey(userId, nodeId)) || null;
    }

    return (
      Array.from(this.devices.values()).find((device) => device.nodeId === nodeId) ||
      null
    );
  }

  async updateDevice(nodeId, patch, userId) {
    const key = userId
      ? this.createScopedKey(userId, nodeId)
      : Array.from(this.devices.keys()).find((item) => item.endsWith(`:${nodeId}`));
    const existing = key ? this.devices.get(key) : null;
    if (!existing) {
      return null;
    }

    const updatedDevice = {
      ...existing,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    this.devices.set(key, updatedDevice);
    return updatedDevice;
  }

  async listReadings(filters = {}) {
    let items = Array.from(this.readings.values());

    if (filters.userId) {
      items = items.filter((item) => item.userId === filters.userId);
    }

    if (filters.nodeId) {
      items = items.filter((item) => item.nodeId === filters.nodeId);
    }

    if (filters.from) {
      items = items.filter((item) => item.timestamp >= filters.from);
    }

    if (filters.to) {
      items = items.filter((item) => item.timestamp <= filters.to);
    }

    if (filters.abnormal) {
      items = items.filter((item) => item.isAbnormal);
    }

    return items
      .sort((left, right) => right.timestamp.localeCompare(left.timestamp))
      .slice(0, filters.limit === undefined ? undefined : filters.limit);
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
    return device?.latestReading || null;
  }
}

module.exports = { MemoryRepository };
