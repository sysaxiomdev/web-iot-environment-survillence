const { ensureWebCrypto } = require("./utils/webcrypto");

ensureWebCrypto();

const { env } = require("./config/env");
const auth = require("./utils/auth");
const httpUtils = require("./utils/http");
const { createValidationHelpers } = require("./utils/validation");
const { HttpError } = require("./utils/errors");
const { createRepository } = require("./repositories");
const { createRouter } = require("./routes");
const { AdminService } = require("./services/adminService");
const { EnvironmentService } = require("./services/environmentService");
const { createLogger } = require("./utils/logger");

const logger = createLogger("api");
const validation = createValidationHelpers(HttpError);
const repository = createRepository(env, logger);
env.effectiveStorageProvider = repository.storageProvider || env.storageProvider;
const adminService = new AdminService(repository, env, auth, HttpError);
const environmentService = new EnvironmentService(repository, env, HttpError);
const routeRequest = createRouter({
  env,
  logger,
  adminService,
  environmentService,
  HttpError,
  auth,
  httpUtils,
  validation,
});

async function bootstrapAdmin() {
  if (typeof repository.countAdmins !== "function") {
    logger.warn("Repository does not support admin bootstrap checks");
    return;
  }

  const existingAdmins = await repository.countAdmins();
  if (existingAdmins > 0) {
    logger.info("Admin bootstrap skipped; admin already exists", {
      count: existingAdmins,
    });
    return;
  }

  if (!env.seedAdminUsername || !env.seedAdminPassword) {
    logger.warn(
      "No admin account found; set BOOTSTRAP_LOGIN_EMAIL and BOOTSTRAP_LOGIN_PASSWORD once to auto-seed MongoDB on startup",
    );
    return;
  }

  await repository.upsertAdmin({
    username: env.seedAdminUsername,
    password: env.seedAdminPassword,
    role: "admin",
    enabled: true,
  });
  logger.info("Admin account auto-seeded in MongoDB", {
    username: env.seedAdminUsername,
  });
}

const bootstrapPromise = bootstrapAdmin().catch((error) => {
  logger.error("Admin bootstrap failed", { message: error.message });
});

async function handleRequest(request, response) {
  httpUtils.attachCors(
    response,
    request.headers.origin,
    env.frontendOrigins,
  );

  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }

  try {
    await bootstrapPromise;
    await routeRequest(request, response);
  } catch (error) {
    logger.error("Unhandled server error", { message: error.message });
    httpUtils.sendJson(response, 500, httpUtils.createErrorPayload(error));
  }
}

module.exports = { env, handleRequest, logger };
