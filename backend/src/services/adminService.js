class AdminService {
  constructor(env, auth, HttpError) {
    this.env = env;
    this.auth = auth;
    this.HttpError = HttpError;
  }

  login(credentials) {
    const usernameMatches = this.auth.safeCompare(
      credentials.username,
      this.env.adminUsername,
    );
    const passwordMatches = this.auth.safeCompare(
      credentials.password,
      this.env.adminPassword,
    );

    if (!usernameMatches || !passwordMatches) {
      throw new this.HttpError(401, "Invalid admin credentials");
    }

    return {
      token: this.auth.createToken(this.env, {
        sub: this.env.adminUsername,
        role: "admin",
      }),
      admin: {
        username: this.env.adminUsername,
        role: "admin",
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
      authMode: "static-admin-bearer-token",
      username: this.env.adminUsername,
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
