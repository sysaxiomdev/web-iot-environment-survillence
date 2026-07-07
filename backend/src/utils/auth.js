const crypto = require("crypto");
const jwt = require("jsonwebtoken");

function safeCompare(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function createToken(env, payload) {
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
}

function verifyToken(env, token, HttpError) {
  try {
    const payload = jwt.verify(token, env.jwtSecret);
    if (payload.role !== "admin") {
      throw new HttpError(403, "Admin role is required");
    }
    return payload;
  } catch (error) {
    throw new HttpError(401, "Invalid admin token");
  }
}

module.exports = { createToken, safeCompare, verifyToken };
