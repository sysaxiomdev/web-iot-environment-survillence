const { env } = require("./config/env");
const { createRepository } = require("./repositories");
const { createLogger } = require("./utils/logger");

async function seedAdmin() {
  const username = process.argv[2];
  const password = process.argv[3];

  if (!username || !password) {
    throw new Error("Usage: npm run seed:admin -- <admin-email> <admin-password>");
  }

  const logger = createLogger("seed-admin");
  const repository = createRepository(env, logger);
  if (repository.storageProvider !== "mongodb") {
    throw new Error("Admin credentials must be seeded into MongoDB storage.");
  }

  await repository.upsertAdmin({
    username,
    password,
    role: "admin",
    enabled: true,
  });

  console.log(`Admin credential stored in MongoDB admin collection for ${username}.`);
  process.exit(0);
}

seedAdmin().catch((error) => {
  console.error("Admin seed failed:", error.message);
  process.exit(1);
});
