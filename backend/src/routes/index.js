function createRoute(method, pattern, handler, options = {}) {
  return {
    method,
    pattern,
    handler,
    auth: options.auth || false,
  };
}

function getBearerToken(request) {
  const header = request.headers.authorization || "";
  if (!header.startsWith("Bearer ")) {
    return null;
  }
  return header.slice("Bearer ".length).trim();
}

function matchRoute(routes, method, pathname) {
  for (const route of routes) {
    if (route.method !== method) {
      continue;
    }

    const match = pathname.match(route.pattern);
    if (match) {
      return {
        route,
        params: match.groups || {},
      };
    }
  }

  return null;
}

function createRouter(deps) {
  const {
    env,
    logger,
    adminService,
    environmentService,
    HttpError,
    auth,
    httpUtils,
    validation,
  } = deps;

  const routes = [
    createRoute("GET", /^\/api\/v1\/health$/, async () => ({
      statusCode: 200,
      body: httpUtils.createSuccess({
        status: "ok",
        requestedStorageProvider: env.storageProvider,
        storageProvider: env.effectiveStorageProvider,
      }),
    })),
    createRoute("POST", /^\/api\/v1\/admin\/login$/, async ({ request }) => {
      const payload = validation.validateLoginPayload(
        await httpUtils.parseJsonBody(request, HttpError),
      );
      const result = adminService.login(payload);
      logger.info("Admin login success", { username: payload.username });
      return {
        statusCode: 200,
        body: httpUtils.createSuccess(result),
      };
    }),
    createRoute(
      "POST",
      /^\/api\/v1\/admin\/logout$/,
      async () => ({
        statusCode: 204,
        noContent: true,
      }),
      { auth: true },
    ),
    createRoute(
      "GET",
      /^\/api\/v1\/admin\/me$/,
      async ({ tokenPayload }) => ({
        statusCode: 200,
        body: httpUtils.createSuccess(adminService.getAdminProfile(tokenPayload)),
      }),
      { auth: true },
    ),
    createRoute(
      "GET",
      /^\/api\/v1\/admin\/settings$/,
      async () => ({
        statusCode: 200,
        body: httpUtils.createSuccess(adminService.getSettings()),
      }),
      { auth: true },
    ),
    createRoute(
      "GET",
      /^\/api\/v1\/dashboard\/summary$/,
      async () => ({
        statusCode: 200,
        body: httpUtils.createSuccess(await environmentService.getDashboardSummary()),
      }),
      { auth: true },
    ),
    createRoute(
      "GET",
      /^\/api\/v1\/users$/,
      async () => ({
        statusCode: 200,
        body: httpUtils.createSuccess(await environmentService.listUsers()),
      }),
      { auth: true },
    ),
    createRoute(
      "GET",
      /^\/api\/v1\/users\/(?<userId>[a-zA-Z0-9_-]+)\/dashboard\/summary$/,
      async ({ params }) => ({
        statusCode: 200,
        body: httpUtils.createSuccess(
          await environmentService.getDashboardSummary({
            userId: validation.validateUserId(params.userId),
          }),
        ),
      }),
      { auth: true },
    ),
    createRoute("POST", /^\/api\/v1\/environmental-data$/, async ({ request }) => {
      const payload = validation.validateReadingPayload(
        await httpUtils.parseJsonBody(request, HttpError),
        env,
      );
      const result = await environmentService.ingestReading(payload);
      logger.info("Reading ingested", {
        nodeId: result.reading.nodeId,
        duplicate: result.duplicate,
      });
      return {
        statusCode: result.duplicate ? 200 : 201,
        body: httpUtils.createSuccess(result),
      };
    }),
    createRoute(
      "POST",
      /^\/api\/v1\/environmental-data\/(?<nodeId>[a-zA-Z0-9_-]+)$/,
      async ({ request, params }) => {
        const rawPayload = await httpUtils.parseJsonBody(request, HttpError);
        const payload = validation.validateReadingPayload(
          {
            ...rawPayload,
            nodeId: params.nodeId,
          },
          env,
        );
        const result = await environmentService.ingestReading(payload);
        logger.info("Reading ingested", {
          nodeId: result.reading.nodeId,
          duplicate: result.duplicate,
        });
        return {
          statusCode: result.duplicate ? 200 : 201,
          body: httpUtils.createSuccess(result),
        };
      },
    ),
    createRoute(
      "POST",
      /^\/api\/v1\/users\/(?<userId>[a-zA-Z0-9_-]+)\/environmental-data$/,
      async ({ request, params }) => {
        const rawPayload = await httpUtils.parseJsonBody(request, HttpError);
        const payload = validation.validateReadingPayload(
          {
            ...rawPayload,
            userId: params.userId,
          },
          env,
        );
        const result = await environmentService.ingestReading(payload);
        logger.info("Reading ingested", {
          userId: payload.userId,
          nodeId: result.reading.nodeId,
          duplicate: result.duplicate,
        });
        return {
          statusCode: result.duplicate ? 200 : 201,
          body: httpUtils.createSuccess(result),
        };
      },
    ),
    createRoute(
      "POST",
      /^\/api\/v1\/users\/(?<userId>[a-zA-Z0-9_-]+)\/environmental-data\/(?<nodeId>[a-zA-Z0-9_-]+)$/,
      async ({ request, params }) => {
        const rawPayload = await httpUtils.parseJsonBody(request, HttpError);
        const payload = validation.validateReadingPayload(
          {
            ...rawPayload,
            userId: params.userId,
            nodeId: params.nodeId,
          },
          env,
        );
        const result = await environmentService.ingestReading(payload);
        logger.info("Reading ingested", {
          userId: payload.userId,
          nodeId: result.reading.nodeId,
          duplicate: result.duplicate,
        });
        return {
          statusCode: result.duplicate ? 200 : 201,
          body: httpUtils.createSuccess(result),
        };
      },
    ),
    createRoute(
      "GET",
      /^\/api\/v1\/environmental-data\/latest$/,
      async () => ({
        statusCode: 200,
        body: httpUtils.createSuccess(await environmentService.getLatestReadings()),
      }),
      { auth: true },
    ),
    createRoute(
      "GET",
      /^\/api\/v1\/users\/(?<userId>[a-zA-Z0-9_-]+)\/environmental-data\/latest$/,
      async ({ params }) => ({
        statusCode: 200,
        body: httpUtils.createSuccess(
          await environmentService.getLatestReadings({
            userId: validation.validateUserId(params.userId),
          }),
        ),
      }),
      { auth: true },
    ),
    createRoute(
      "GET",
      /^\/api\/v1\/users\/(?<userId>[a-zA-Z0-9_-]+)\/environmental-data\/(?<nodeId>[a-zA-Z0-9_-]+)\/history$/,
      async ({ params, searchParams }) => ({
        statusCode: 200,
        body: httpUtils.createSuccess(
          await environmentService.getReadingsForDevice(
            validation.validateNodeId(params.nodeId),
            {
              ...validation.parseReadingFilters(searchParams, env),
              userId: validation.validateUserId(params.userId),
            },
          ),
        ),
      }),
      { auth: true },
    ),
    createRoute(
      "GET",
      /^\/api\/v1\/users\/(?<userId>[a-zA-Z0-9_-]+)\/environmental-data\/(?<nodeId>[a-zA-Z0-9_-]+)$/,
      async ({ params, searchParams }) => ({
        statusCode: 200,
        body: httpUtils.createSuccess(
          await environmentService.getReadingsForDevice(
            validation.validateNodeId(params.nodeId),
            {
              ...validation.parseReadingFilters(searchParams, env),
              userId: validation.validateUserId(params.userId),
            },
          ),
        ),
      }),
      { auth: true },
    ),
    createRoute(
      "GET",
      /^\/api\/v1\/users\/(?<userId>[a-zA-Z0-9_-]+)\/environmental-data$/,
      async ({ params, searchParams }) => ({
        statusCode: 200,
        body: httpUtils.createSuccess(
          await environmentService.listReadings({
            ...validation.parseReadingFilters(searchParams, env),
            userId: validation.validateUserId(params.userId),
          }),
        ),
      }),
      { auth: false },
    ),
    createRoute(
      "GET",
      /^\/api\/v1\/environmental-data\/(?<nodeId>[a-zA-Z0-9_-]+)\/history$/,
      async ({ params, searchParams }) => ({
        statusCode: 200,
        body: httpUtils.createSuccess(
          await environmentService.getReadingsForDevice(
            validation.validateNodeId(params.nodeId),
            validation.parseReadingFilters(searchParams, env),
          ),
        ),
      }),
      { auth: true },
    ),
    createRoute(
      "GET",
      /^\/api\/v1\/environmental-data\/(?<nodeId>[a-zA-Z0-9_-]+)$/,
      async ({ params, searchParams }) => ({
        statusCode: 200,
        body: httpUtils.createSuccess(
          await environmentService.getReadingsForDevice(
            validation.validateNodeId(params.nodeId),
            validation.parseReadingFilters(searchParams, env),
          ),
        ),
      }),
      { auth: true },
    ),
    createRoute(
      "GET",
      /^\/api\/v1\/environmental-data$/,
      async ({ searchParams }) => ({
        statusCode: 200,
        body: httpUtils.createSuccess(
          await environmentService.listReadings(
            validation.parseReadingFilters(searchParams, env),
          ),
        ),
      }),
      { auth: true },
    ),
    createRoute(
      "GET",
      /^\/api\/v1\/devices$/,
      async () => ({
        statusCode: 200,
        body: httpUtils.createSuccess(await environmentService.listDevices()),
      }),
      { auth: true },
    ),
    createRoute(
      "GET",
      /^\/api\/v1\/users\/(?<userId>[a-zA-Z0-9_-]+)\/devices$/,
      async ({ params }) => ({
        statusCode: 200,
        body: httpUtils.createSuccess(
          await environmentService.listDevices({
            userId: validation.validateUserId(params.userId),
          }),
        ),
      }),
      { auth: true },
    ),
    createRoute(
      "GET",
      /^\/api\/v1\/devices\/(?<nodeId>[a-zA-Z0-9_-]+)\/latest-reading$/,
      async ({ params }) => ({
        statusCode: 200,
        body: httpUtils.createSuccess(
          await environmentService.getLatestReadingForDevice(
            validation.validateNodeId(params.nodeId),
          ),
        ),
      }),
      { auth: true },
    ),
    createRoute(
      "GET",
      /^\/api\/v1\/users\/(?<userId>[a-zA-Z0-9_-]+)\/devices\/(?<nodeId>[a-zA-Z0-9_-]+)\/latest-reading$/,
      async ({ params }) => ({
        statusCode: 200,
        body: httpUtils.createSuccess(
          await environmentService.getLatestReadingForDevice(
            validation.validateNodeId(params.nodeId),
            validation.validateUserId(params.userId),
          ),
        ),
      }),
      { auth: true },
    ),
    createRoute(
      "GET",
      /^\/api\/v1\/devices\/(?<nodeId>[a-zA-Z0-9_-]+)$/,
      async ({ params }) => ({
        statusCode: 200,
        body: httpUtils.createSuccess(
          await environmentService.getDevice(
            validation.validateNodeId(params.nodeId),
          ),
        ),
      }),
      { auth: true },
    ),
    createRoute(
      "GET",
      /^\/api\/v1\/users\/(?<userId>[a-zA-Z0-9_-]+)\/devices\/(?<nodeId>[a-zA-Z0-9_-]+)$/,
      async ({ params }) => ({
        statusCode: 200,
        body: httpUtils.createSuccess(
          await environmentService.getDevice(
            validation.validateNodeId(params.nodeId),
            validation.validateUserId(params.userId),
          ),
        ),
      }),
      { auth: true },
    ),
    createRoute(
      "PATCH",
      /^\/api\/v1\/devices\/(?<nodeId>[a-zA-Z0-9_-]+)$/,
      async ({ request, params }) => ({
        statusCode: 200,
        body: httpUtils.createSuccess(
          await environmentService.updateDevice(
            validation.validateNodeId(params.nodeId),
            validation.validateDevicePatchPayload(
              await httpUtils.parseJsonBody(request, HttpError),
            ),
          ),
        ),
      }),
      { auth: true },
    ),
    createRoute(
      "PATCH",
      /^\/api\/v1\/users\/(?<userId>[a-zA-Z0-9_-]+)\/devices\/(?<nodeId>[a-zA-Z0-9_-]+)$/,
      async ({ request, params }) => ({
        statusCode: 200,
        body: httpUtils.createSuccess(
          await environmentService.updateDevice(
            validation.validateNodeId(params.nodeId),
            validation.validateDevicePatchPayload(
              await httpUtils.parseJsonBody(request, HttpError),
            ),
            validation.validateUserId(params.userId),
          ),
        ),
      }),
      { auth: true },
    ),
    createRoute(
      "GET",
      /^\/api\/v1\/alerts$/,
      async ({ searchParams }) => ({
        statusCode: 200,
        body: httpUtils.createSuccess(
          await environmentService.getAlerts(Number(searchParams.get("limit")) || 100),
        ),
      }),
      { auth: true },
    ),
  ];

  return async function routeRequest(request, response) {
    const requestUrl = new URL(request.url, `http://${request.headers.host}`);
    const matched = matchRoute(routes, request.method, requestUrl.pathname);

    if (!matched) {
      httpUtils.sendJson(
        response,
        404,
        httpUtils.createErrorPayload(new HttpError(404, "Route not found")),
      );
      return;
    }

    try {
      let tokenPayload = null;
      if (matched.route.auth) {
        const token = getBearerToken(request);
        if (!token) {
          throw new HttpError(401, "Missing admin bearer token");
        }
        tokenPayload = auth.verifyToken(env, token, HttpError);
      }

      const result = await matched.route.handler({
        request,
        params: matched.params,
        searchParams: requestUrl.searchParams,
        tokenPayload,
      });

      if (result.noContent) {
        httpUtils.sendNoContent(response);
        return;
      }

      httpUtils.sendJson(response, result.statusCode || 200, result.body);
    } catch (error) {
      if (
        matched.route.pattern.source === "^\\/api\\/v1\\/admin\\/login$" &&
        error.statusCode === 401
      ) {
        logger.warn("Admin login failure", {
          ip: request.socket.remoteAddress,
        });
      } else if (error.statusCode >= 500 || !error.statusCode) {
        logger.error("Request failed", {
          path: requestUrl.pathname,
          message: error.message,
        });
      }

      httpUtils.sendJson(
        response,
        error.statusCode || 500,
        httpUtils.createErrorPayload(error),
      );
    }
  };
}

module.exports = { createRouter };
