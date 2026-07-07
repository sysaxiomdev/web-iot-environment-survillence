function sendJson(response, statusCode, payload, extraHeaders = {}) {
  const body = JSON.stringify(payload);
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    ...extraHeaders,
  });
  response.end(body);
}

function sendNoContent(response, extraHeaders = {}) {
  response.writeHead(204, extraHeaders);
  response.end();
}

function attachCors(response, requestOrigin, allowedOrigins = []) {
  const origin = requestOrigin && allowedOrigins.includes(requestOrigin)
    ? requestOrigin
    : allowedOrigins[0];

  if (origin) {
    response.setHeader("Access-Control-Allow-Origin", origin);
    response.setHeader("Vary", "Origin");
  }

  response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  response.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,OPTIONS");
}

function parseJsonBody(request, HttpError) {
  return new Promise((resolve, reject) => {
    let raw = "";

    request.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1024 * 1024) {
        reject(new HttpError(413, "Payload too large"));
        request.destroy();
      }
    });

    request.on("end", () => {
      if (!raw) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(new HttpError(400, "Invalid JSON body"));
      }
    });

    request.on("error", () => {
      reject(new HttpError(400, "Failed to read request body"));
    });
  });
}

function createSuccess(data, meta) {
  return {
    success: true,
    data,
    ...(meta ? { meta } : {}),
  };
}

function createErrorPayload(error) {
  return {
    success: false,
    error: {
      code: error.statusCode || 500,
      message: error.message || "Internal server error",
      ...(error.details ? { details: error.details } : {}),
    },
  };
}

module.exports = {
  attachCors,
  createErrorPayload,
  createSuccess,
  parseJsonBody,
  sendJson,
  sendNoContent,
};
