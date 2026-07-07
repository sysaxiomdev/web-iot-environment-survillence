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
const adminService = new AdminService(env, auth, HttpError);
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
    await routeRequest(request, response);
  } catch (error) {
    logger.error("Unhandled server error", { message: error.message });
    httpUtils.sendJson(response, 500, httpUtils.createErrorPayload(error));
  }
}

module.exports = { env, handleRequest, logger };
