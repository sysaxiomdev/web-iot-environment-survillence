function computeDeviceStatus(device, env) {
  if (!device?.lastSeenAt) {
    return "never_synced";
  }

  const ageMinutes =
    (Date.now() - new Date(device.lastSeenAt).getTime()) / 60000;

  return ageMinutes <= env.activeDeviceWindowMinutes ? "active" : "inactive";
}

function computeAbnormal(reading) {
  return Boolean(
    reading?.alerts?.aqi ||
      reading?.alerts?.temperatureHigh ||
      reading?.alerts?.temperatureLow ||
      reading?.alerts?.humidityHigh ||
      reading?.alerts?.humidityLow ||
      reading?.alerts?.stale,
  );
}

function buildAlerts(reading, env) {
  const readingTimestamp = reading.timestamp || reading.serverTimestamp;
  const ageMinutes =
    (Date.now() - new Date(readingTimestamp).getTime()) / 60000;

  return {
    aqi: reading.aqi >= env.alertAqiThreshold,
    temperatureHigh: reading.temperature >= env.alertTemperatureHigh,
    temperatureLow: reading.temperature <= env.alertTemperatureLow,
    humidityHigh: reading.humidity >= env.alertHumidityHigh,
    humidityLow: reading.humidity <= env.alertHumidityLow,
    stale: ageMinutes > env.allowStaleReadingsMinutes,
  };
}

class EnvironmentService {
  constructor(repository, env, HttpError) {
    this.repository = repository;
    this.env = env;
    this.HttpError = HttpError;
  }

  async ingestReading(reading) {
    const serverTimestamp = new Date().toISOString();
    const enriched = {
      ...reading,
      timestamp: reading.timestamp || serverTimestamp,
      serverTimestamp,
    };

    enriched.alerts = buildAlerts(enriched, this.env);
    enriched.isAbnormal = computeAbnormal(enriched);

    return this.repository.saveReading(enriched);
  }

  async listUsers() {
    return this.repository.listUsers();
  }

  async listDevices(filters = {}) {
    const devices = await this.repository.listDevices(filters);
    return devices.map((device) => ({
      ...device,
      status: computeDeviceStatus(device, this.env),
    }));
  }

  async getDevice(nodeId, userId) {
    const device = await this.repository.getDevice(nodeId, userId);
    if (!device) {
      throw new this.HttpError(404, "Device not found");
    }

    return {
      ...device,
      status: computeDeviceStatus(device, this.env),
    };
  }

  async updateDevice(nodeId, patch, userId) {
    const device = await this.repository.updateDevice(nodeId, patch, userId);
    if (!device) {
      throw new this.HttpError(404, "Device not found");
    }

    return {
      ...device,
      status: computeDeviceStatus(device, this.env),
    };
  }

  async listReadings(filters) {
    return this.repository.listReadings(filters);
  }

  async getReadingsForDevice(nodeId, filters = {}) {
    await this.getDevice(nodeId, filters.userId);
    return this.repository.listReadings({
      ...filters,
      nodeId,
    });
  }

  async getLatestReadings(filters = {}) {
    return this.repository.getLatestReadings(filters);
  }

  async getLatestReadingForDevice(nodeId, userId) {
    const reading = await this.repository.getLatestReadingForDevice(nodeId, userId);
    if (!reading) {
      throw new this.HttpError(404, "Latest reading not found");
    }
    return reading;
  }

  async getAlerts(limit = 100, filters = {}) {
    return this.repository.listReadings({
      ...filters,
      abnormal: true,
      limit,
    });
  }

  async getDashboardSummary(filters = {}) {
    const [devices, alerts, recentReadings] = await Promise.all([
      this.listDevices(filters),
      this.getAlerts(10, filters),
      this.repository.listReadings({
        ...filters,
        limit: 24,
      }),
    ]);

    const activeDevices = devices.filter((device) => device.status === "active");
    const latestReadings = devices
      .map((device) => device.latestReading)
      .filter(Boolean)
      .sort((left, right) => right.timestamp.localeCompare(left.timestamp));

    return {
      totals: {
        devices: devices.length,
        activeDevices: activeDevices.length,
        latestReadings: latestReadings.length,
        abnormalReadings: alerts.length,
      },
      latestReadings,
      alertsPreview: alerts,
      recentTrend: recentReadings.reverse(),
    };
  }
}

module.exports = { EnvironmentService };
