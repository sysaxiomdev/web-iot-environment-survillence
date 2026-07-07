class AdminService {
  constructor(repository, env, auth, HttpError) {
    this.repository = repository;
    this.env = env;
    this.auth = auth;
    this.HttpError = HttpError;
  }

  async login(credentials) {
    const admin = await this.repository.findAdminByUsername(credentials.username);
    if (!admin) {
      throw new this.HttpError(401, "Invalid admin credentials");
    }

    const passwordMatches = this.auth.safeCompare(
      credentials.password,
      admin.password,
    );

    if (!passwordMatches) {
      throw new this.HttpError(401, "Invalid admin credentials");
    }

    return {
      token: this.auth.createToken(this.env, {
        sub: admin.username,
        role: admin.role || "admin",
      }),
      admin: {
        username: admin.username,
        role: admin.role || "admin",
      },
    };
  }

  getAdminProfile(tokenPayload) {
    return {
      username: tokenPayload.sub,
      role: tokenPayload.role,
    };
  }

  getSettings() {
    return {
      authMode: "mongo-admin-jwt",
      requestedStorageProvider: this.env.storageProvider,
      storageProvider: this.env.effectiveStorageProvider,
      activeDeviceWindowMinutes: this.env.activeDeviceWindowMinutes,
      alertThresholds: {
        aqi: this.env.alertAqiThreshold,
        temperatureHigh: this.env.alertTemperatureHigh,
        temperatureLow: this.env.alertTemperatureLow,
        humidityHigh: this.env.alertHumidityHigh,
        humidityLow: this.env.alertHumidityLow,
      },
    };
  }
}

module.exports = { AdminService };
