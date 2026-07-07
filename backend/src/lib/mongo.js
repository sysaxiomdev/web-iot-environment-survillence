const { ensureWebCrypto } = require("../utils/webcrypto");

ensureWebCrypto();

const { MongoClient } = require("mongodb");

function createMongoClient(env) {
  if (env.storageProvider !== "mongodb") {
    throw new Error("MongoDB storage requested but storageProvider is not mongodb");
  }

  if (!env.mongoUri) {
    throw new Error("MongoDB storage requested but MONGO_URI is not configured");
  }

  const client = new MongoClient(env.mongoUri);
  return client.db(env.mongoDbName);
}

module.exports = { createMongoClient };
