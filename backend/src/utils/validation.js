function createValidationHelpers(HttpError) {
  const NODE_ID_PATTERN = /^[a-zA-Z0-9_-]{2,64}$/;
  const USER_ID_PATTERN = /^[a-zA-Z0-9_-]{2,128}$/;

  function ensureObject(value, message) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new HttpError(400, message);
    }
  }

  function normalizeTimestamp(value) {
    const timestamp = new Date(value);
    if (Number.isNaN(timestamp.getTime())) {
      throw new HttpError(400, "Invalid timestamp");
    }

    return timestamp.toISOString();
  }

  function toNumber(value, fieldName) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      throw new HttpError(400, `${fieldName} must be a valid number`);
    }
    return parsed;
  }

  function validateNodeId(nodeId) {
    if (!NODE_ID_PATTERN.test(String(nodeId || ""))) {
      throw new HttpError(
        400,
        "nodeId must be 2-64 characters using letters, numbers, dashes, or underscores",
      );
    }

    return String(nodeId);
  }

  function validateUserId(userId) {
    if (!USER_ID_PATTERN.test(String(userId || ""))) {
      throw new HttpError(
        400,
        "userId must be 2-128 characters using letters, numbers, dashes, or underscores",
      );
    }

    return String(userId);
  }

  function validateLoginPayload(payload) {
    ensureObject(payload, "Login payload must be a JSON object");

    const username = String(payload.username || "").trim();
    const password = String(payload.password || "");

    if (!username || !password) {
      throw new HttpError(400, "Username and password are required");
    }

    return { username, password };
  }

  function validateReadingPayload(payload) {
    ensureObject(payload, "Reading payload must be a JSON object");

    const rawNodeId = payload.nodeId || payload.node_id || payload.id;
    const nodeId = rawNodeId ? validateNodeId(rawNodeId) : undefined;
    const userId =
      payload.userId || payload.user_id
        ? validateUserId(payload.userId || payload.user_id)
        : undefined;
    const temperature = toNumber(payload.temperature, "temperature");
    const humidity = toNumber(payload.humidity, "humidity");
    const aqi = toNumber(payload.aqi, "aqi");
    const timestamp =
      payload.timestamp === undefined || payload.timestamp === null || payload.timestamp === ""
        ? undefined
        : normalizeTimestamp(payload.timestamp);

    if (temperature < -50 || temperature > 100) {
      throw new HttpError(400, "temperature is outside the supported range");
    }

    if (humidity < 0 || humidity > 100) {
      throw new HttpError(400, "humidity is outside the supported range");
    }

    if (aqi < 0 || aqi > 500) {
      throw new HttpError(400, "aqi is outside the supported range");
    }

    if (!userId && !nodeId) {
      throw new HttpError(400, "userId is required when nodeId is not provided");
    }

    return {
      userId,
      nodeId,
      temperature,
      humidity,
      aqi,
      timestamp,
    };
  }

  function validateDevicePatchPayload(payload) {
    ensureObject(payload, "Device update payload must be a JSON object");

    const update = {};

    if ("name" in payload) {
      update.name = String(payload.name || "").trim();
    }

    if ("location" in payload) {
      update.location = String(payload.location || "").trim();
    }

    if ("notes" in payload) {
      update.notes = String(payload.notes || "").trim();
    }

    if ("enabled" in payload) {
      update.enabled = Boolean(payload.enabled);
    }

    if (Object.keys(update).length === 0) {
      throw new HttpError(400, "At least one device field must be provided");
    }

    return update;
  }

  function parseReadingFilters(searchParams, env) {
    const rawLimit = searchParams.get("limit");
    const limit = rawLimit === null
      ? undefined
      : Math.min(toNumber(rawLimit, "limit"), env.maxHistoricalResults);

    return {
      userId: searchParams.get("userId")
        ? validateUserId(searchParams.get("userId"))
        : undefined,
      nodeId: searchParams.get("nodeId") || undefined,
      from: searchParams.get("from")
        ? normalizeTimestamp(searchParams.get("from"))
        : undefined,
      to: searchParams.get("to")
        ? normalizeTimestamp(searchParams.get("to"))
        : undefined,
      abnormal: searchParams.get("abnormal") === "true",
      limit,
    };
  }

  return {
    parseReadingFilters,
    validateDevicePatchPayload,
    validateLoginPayload,
    validateNodeId,
    validateUserId,
    validateReadingPayload,
  };
}

module.exports = { createValidationHelpers };
