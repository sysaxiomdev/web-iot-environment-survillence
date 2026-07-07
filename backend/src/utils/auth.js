const crypto = require("crypto");

function safeCompare(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function createToken(env) {
  return env.adminBearerToken;
}

function verifyToken(env, token, HttpError) {
  if (!safeCompare(token, env.adminBearerToken)) {
    throw new HttpError(401, "Invalid admin token");
  }

  return {
    sub: env.adminUsername,
    role: "admin",
  };
}

module.exports = { createToken, safeCompare, verifyToken };
