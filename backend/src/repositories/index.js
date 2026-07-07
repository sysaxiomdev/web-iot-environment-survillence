const { createMongoClient } = require("../lib/mongo");
const { MongoRepository } = require("./mongoRepository");
const { MemoryRepository } = require("./memoryRepository");

function createRepository(env, logger) {
  if (env.storageProvider === "mongodb") {
    if (!env.mongoUri || env.mongoUri.includes("<your-cluster>")) {
      logger.warn(
        "MongoDB URI is not configured or still using a placeholder; falling back to in-memory repository",
      );

      if (env.nodeEnv === "production") {
        throw new Error(
          "STORAGE_PROVIDER=mongodb requires a real MONGO_URI in production",
        );
      }
    } else {
      try {
        const db = createMongoClient(env);
        logger.info("Using MongoDB repository");
        const repository = new MongoRepository(db, env);
        repository.storageProvider = "mongodb";
        return repository;
      } catch (error) {
        if (env.nodeEnv === "production") {
          throw error;
        }

        logger.warn("Falling back to in-memory repository", {
          reason: error.message,
        });
      }
    }
  }

  logger.info("Using in-memory repository");
  const repository = new MemoryRepository();
  repository.storageProvider = "memory";
  return repository;
}

module.exports = { createRepository };
