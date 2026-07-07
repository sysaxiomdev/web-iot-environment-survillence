import { ADMIN_AUTH_HEADER, ADMIN_BEARER_TOKEN } from "../constants/auth";

const defaultApiBaseUrl = "https://iot-environmental-surveillance-app.onrender.com";

export function createOpenApiSpec(apiBaseUrl = defaultApiBaseUrl) {
  return {
    openapi: "3.0.3",
    info: {
      title: "IoT Environmental Surveillance API",
      version: "1.0.0",
      description:
        "Admin and ingestion API for the IoT environmental surveillance application.",
    },
    servers: [
      {
        url: apiBaseUrl,
        description: "Configured API server",
      },
    ],
    tags: [
      { name: "Auth", description: "Admin authentication endpoints" },
      { name: "Users", description: "User-scoped data access" },
      { name: "Devices", description: "Device metadata and latest device readings" },
      { name: "Readings", description: "Environmental reading ingest and retrieval" },
      { name: "Dashboard", description: "Dashboard summary endpoints" },
      { name: "Operations", description: "Health and operational endpoints" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "StaticToken",
          description: `Send ${ADMIN_AUTH_HEADER}`,
        },
      },
      schemas: {
        LoginPayload: {
          type: "object",
          required: ["username", "password"],
          properties: {
            username: { type: "string", example: "admin" },
            password: { type: "string", example: "admin" },
          },
        },
        AdminProfile: {
          type: "object",
          properties: {
            username: { type: "string", example: "admin" },
            role: { type: "string", example: "admin" },
          },
        },
        AlertFlags: {
          type: "object",
          properties: {
            aqi: { type: "boolean" },
            temperatureHigh: { type: "boolean" },
            temperatureLow: { type: "boolean" },
            humidityHigh: { type: "boolean" },
            humidityLow: { type: "boolean" },
            stale: { type: "boolean" },
          },
        },
        Reading: {
          type: "object",
          properties: {
            id: { type: "string" },
            userId: { type: "string" },
            nodeId: { type: "string" },
            temperature: { type: "number" },
            humidity: { type: "number" },
            aqi: { type: "number" },
            timestamp: { type: "string", format: "date-time" },
            serverTimestamp: { type: "string", format: "date-time" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
            isAbnormal: { type: "boolean" },
            alerts: { $ref: "#/components/schemas/AlertFlags" },
          },
        },
        Device: {
          type: "object",
          properties: {
            userId: { type: "string" },
            nodeId: { type: "string" },
            name: { type: "string" },
            location: { type: "string" },
            notes: { type: "string" },
            enabled: { type: "boolean" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
            lastSeenAt: { type: "string", format: "date-time" },
            status: { type: "string", example: "active" },
            latestReading: { $ref: "#/components/schemas/Reading" },
          },
        },
        DevicePatchPayload: {
          type: "object",
          properties: {
            name: { type: "string", example: "Warehouse monitor" },
            location: { type: "string", example: "Warehouse A" },
            notes: { type: "string", example: "Mounted above the loading bay" },
            enabled: { type: "boolean", example: true },
          },
        },
        ReadingIngestPayload: {
          type: "object",
          required: ["temperature", "humidity", "aqi"],
          properties: {
            user_id: {
              type: "string",
              description: "User ID in Firestore",
              example: "34dbNI5JJ9QqZl49vqWsPhxjbf72",
            },
            userId: {
              type: "string",
              description: "CamelCase alias for user_id",
              example: "34dbNI5JJ9QqZl49vqWsPhxjbf72",
            },
            node_id: {
              type: "string",
              description: "Optional node ID. If omitted, the backend generates one.",
              example: "node_001",
            },
            nodeId: {
              type: "string",
              description: "CamelCase alias for node_id",
              example: "node_001",
            },
            temperature: { type: "number", format: "float", example: 27.4 },
            humidity: { type: "number", format: "float", example: 74 },
            aqi: { type: "number", format: "float", example: 36 },
            timestamp: {
              oneOf: [
                { type: "integer", example: 1733011200000 },
                { type: "string", format: "date-time", example: "2026-03-09T12:00:00.000Z" },
              ],
              description: "Optional sensor event time. When omitted, the backend uses server system time.",
            },
          },
        },
        AlertThresholds: {
          type: "object",
          properties: {
            aqi: { type: "number", example: 100 },
            temperatureHigh: { type: "number", example: 40 },
            temperatureLow: { type: "number", example: 0 },
            humidityHigh: { type: "number", example: 80 },
            humidityLow: { type: "number", example: 20 },
          },
        },
        AdminSettings: {
          type: "object",
          properties: {
            authMode: { type: "string", example: "static-admin-bearer-token" },
            username: { type: "string", example: "admin" },
            storageProvider: { type: "string", example: "firestore" },
            activeDeviceWindowMinutes: { type: "number", example: 30 },
            alertThresholds: { $ref: "#/components/schemas/AlertThresholds" },
          },
        },
        DashboardTotals: {
          type: "object",
          properties: {
            devices: { type: "integer", example: 4 },
            activeDevices: { type: "integer", example: 3 },
            latestReadings: { type: "integer", example: 4 },
            abnormalReadings: { type: "integer", example: 1 },
          },
        },
        DashboardSummary: {
          type: "object",
          properties: {
            totals: { $ref: "#/components/schemas/DashboardTotals" },
            latestReadings: {
              type: "array",
              items: { $ref: "#/components/schemas/Reading" },
            },
            alertsPreview: {
              type: "array",
              items: { $ref: "#/components/schemas/Reading" },
            },
            recentTrend: {
              type: "array",
              items: { $ref: "#/components/schemas/Reading" },
            },
          },
        },
        LoginResponseData: {
          type: "object",
          properties: {
            token: { type: "string", example: ADMIN_BEARER_TOKEN },
            admin: { $ref: "#/components/schemas/AdminProfile" },
          },
        },
        IngestResponseData: {
          type: "object",
          properties: {
            duplicate: { type: "boolean" },
            reading: { $ref: "#/components/schemas/Reading" },
          },
        },
        SuccessEnvelopeLogin: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: { $ref: "#/components/schemas/LoginResponseData" },
          },
        },
        SuccessEnvelopeUsers: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: {
              type: "array",
              items: { type: "string" },
              example: ["34dbNI5JJ9QqZl49vqWsPhxjbf72"],
            },
          },
        },
        SuccessEnvelopeDevice: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: { $ref: "#/components/schemas/Device" },
          },
        },
        SuccessEnvelopeDevices: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: {
              type: "array",
              items: { $ref: "#/components/schemas/Device" },
            },
          },
        },
        SuccessEnvelopeReading: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: { $ref: "#/components/schemas/Reading" },
          },
        },
        SuccessEnvelopeReadings: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: {
              type: "array",
              items: { $ref: "#/components/schemas/Reading" },
            },
          },
        },
        SuccessEnvelopeSettings: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: { $ref: "#/components/schemas/AdminSettings" },
          },
        },
        SuccessEnvelopeDashboard: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: { $ref: "#/components/schemas/DashboardSummary" },
          },
        },
        SuccessEnvelopeHealth: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: {
              type: "object",
              properties: {
                status: { type: "string", example: "ok" },
                storageProvider: { type: "string", example: "firestore" },
              },
            },
          },
        },
        ErrorEnvelope: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            error: {
              type: "object",
              properties: {
                code: { type: "integer", example: 400 },
                message: { type: "string", example: "Request failed" },
              },
            },
          },
        },
      },
    },
    paths: {
      "/api/v1/health": {
        get: {
          tags: ["Operations"],
          summary: "Check API health",
          responses: {
            200: {
              description: "Health payload",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/SuccessEnvelopeHealth" },
                },
              },
            },
          },
        },
      },
      "/api/v1/admin/login": {
        post: {
          tags: ["Auth"],
          summary: "Compatibility admin login",
          description: "Validates static admin credentials and returns the fixed bearer token.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/LoginPayload" },
              },
            },
          },
          responses: {
            200: {
              description: "Fixed bearer token and admin profile",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/SuccessEnvelopeLogin" },
                },
              },
            },
            401: {
              description: "Invalid credentials",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorEnvelope" },
                },
              },
            },
          },
        },
      },
      "/api/v1/admin/me": {
        get: {
          tags: ["Auth"],
          summary: "Get current admin profile",
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: "Current admin",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean", example: true },
                      data: { $ref: "#/components/schemas/AdminProfile" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/api/v1/admin/settings": {
        get: {
          tags: ["Auth", "Operations"],
          summary: "Get backend settings",
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: "Settings payload",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/SuccessEnvelopeSettings" },
                },
              },
            },
          },
        },
      },
      "/api/v1/dashboard/summary": {
        get: {
          tags: ["Dashboard"],
          summary: "Get overall dashboard summary",
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: "Dashboard summary",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/SuccessEnvelopeDashboard" },
                },
              },
            },
          },
        },
      },
      "/api/v1/users": {
        get: {
          tags: ["Users"],
          summary: "List all user IDs",
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: "User ID list",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/SuccessEnvelopeUsers" },
                },
              },
            },
          },
        },
      },
      "/api/v1/users/{userId}/dashboard/summary": {
        get: {
          tags: ["Users", "Dashboard"],
          summary: "Get dashboard summary for one user",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "userId",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            200: {
              description: "User-scoped dashboard summary",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/SuccessEnvelopeDashboard" },
                },
              },
            },
          },
        },
      },
      "/api/v1/environmental-data": {
        post: {
          tags: ["Readings"],
          summary: "Ingest an environmental reading",
          description:
            "Accepts userId/user_id in the request body. nodeId/node_id is optional and will be auto-generated when omitted.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ReadingIngestPayload" },
              },
            },
          },
          responses: {
            200: {
              description: "Duplicate reading accepted",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/SuccessEnvelopeIngest" },
                },
              },
            },
            201: {
              description: "New reading created",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/SuccessEnvelopeIngest" },
                },
              },
            },
            400: {
              description: "Validation error",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorEnvelope" },
                },
              },
            },
          },
        },
        get: {
          tags: ["Readings"],
          summary: "List readings across all users",
          security: [{ bearerAuth: [] }],
          parameters: [
            { in: "query", name: "nodeId", schema: { type: "string" } },
            { in: "query", name: "from", schema: { type: "string", format: "date-time" } },
            { in: "query", name: "to", schema: { type: "string", format: "date-time" } },
            { in: "query", name: "abnormal", schema: { type: "boolean" } },
            { in: "query", name: "limit", schema: { type: "integer", default: 100 } },
          ],
          responses: {
            200: {
              description: "Reading list",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/SuccessEnvelopeReadings" },
                },
              },
            },
          },
        },
      },
      "/api/v1/environmental-data/latest": {
        get: {
          tags: ["Readings"],
          summary: "Get latest readings across all devices",
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: "Latest readings",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/SuccessEnvelopeReadings" },
                },
              },
            },
          },
        },
      },
      "/api/v1/users/{userId}/environmental-data": {
        post: {
          tags: ["Users", "Readings"],
          summary: "Ingest a reading for one user",
          description:
            "User ID is provided in the path. nodeId/node_id remains optional in the body and will be generated when omitted.",
          parameters: [
            {
              in: "path",
              name: "userId",
              required: true,
              schema: { type: "string" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ReadingIngestPayload" },
              },
            },
          },
          responses: {
            200: {
              description: "Duplicate reading accepted",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/SuccessEnvelopeIngest" },
                },
              },
            },
            201: {
              description: "New reading created",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/SuccessEnvelopeIngest" },
                },
              },
            },
          },
        },
        get: {
          tags: ["Users", "Readings"],
          summary: "List readings for a single user",
          description:
            "Use this path for user-scoped retrieval. The backend does not expose GET /api/v1/environmental-data/{userId}.",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "userId",
              required: true,
              schema: { type: "string" },
            },
            { in: "query", name: "nodeId", schema: { type: "string" } },
            { in: "query", name: "from", schema: { type: "string", format: "date-time" } },
            { in: "query", name: "to", schema: { type: "string", format: "date-time" } },
            { in: "query", name: "abnormal", schema: { type: "boolean" } },
            { in: "query", name: "limit", schema: { type: "integer", default: 100 } },
          ],
          responses: {
            200: {
              description: "User-scoped reading list",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/SuccessEnvelopeReadings" },
                },
              },
            },
          },
        },
      },
      "/api/v1/users/{userId}/environmental-data/latest": {
        get: {
          tags: ["Users", "Readings"],
          summary: "Get latest readings for one user",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "userId",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            200: {
              description: "Latest user readings",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/SuccessEnvelopeReadings" },
                },
              },
            },
          },
        },
      },
      "/api/v1/devices": {
        get: {
          tags: ["Devices"],
          summary: "List all devices",
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: "Device list",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/SuccessEnvelopeDevices" },
                },
              },
            },
          },
        },
      },
      "/api/v1/users/{userId}/devices": {
        get: {
          tags: ["Users", "Devices"],
          summary: "List devices for one user",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "userId",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            200: {
              description: "User device list",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/SuccessEnvelopeDevices" },
                },
              },
            },
          },
        },
      },
      "/api/v1/devices/{nodeId}": {
        get: {
          tags: ["Devices"],
          summary: "Get one device by nodeId",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "nodeId",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            200: {
              description: "Device details",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/SuccessEnvelopeDevice" },
                },
              },
            },
          },
        },
        patch: {
          tags: ["Devices"],
          summary: "Update device metadata by nodeId",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "nodeId",
              required: true,
              schema: { type: "string" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/DevicePatchPayload" },
              },
            },
          },
          responses: {
            200: {
              description: "Updated device",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/SuccessEnvelopeDevice" },
                },
              },
            },
          },
        },
      },
      "/api/v1/users/{userId}/devices/{nodeId}": {
        get: {
          tags: ["Users", "Devices"],
          summary: "Get one device for one user",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "userId",
              required: true,
              schema: { type: "string" },
            },
            {
              in: "path",
              name: "nodeId",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            200: {
              description: "User-scoped device details",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/SuccessEnvelopeDevice" },
                },
              },
            },
          },
        },
        patch: {
          tags: ["Users", "Devices"],
          summary: "Update one device for one user",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "userId",
              required: true,
              schema: { type: "string" },
            },
            {
              in: "path",
              name: "nodeId",
              required: true,
              schema: { type: "string" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/DevicePatchPayload" },
              },
            },
          },
          responses: {
            200: {
              description: "Updated device",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/SuccessEnvelopeDevice" },
                },
              },
            },
          },
        },
      },
      "/api/v1/devices/{nodeId}/latest-reading": {
        get: {
          tags: ["Devices", "Readings"],
          summary: "Get the latest reading for one device",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "nodeId",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            200: {
              description: "Latest device reading",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/SuccessEnvelopeReading" },
                },
              },
            },
          },
        },
      },
      "/api/v1/users/{userId}/devices/{nodeId}/latest-reading": {
        get: {
          tags: ["Users", "Devices", "Readings"],
          summary: "Get the latest reading for one user device",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              in: "path",
              name: "userId",
              required: true,
              schema: { type: "string" },
            },
            {
              in: "path",
              name: "nodeId",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            200: {
              description: "Latest user device reading",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/SuccessEnvelopeReading" },
                },
              },
            },
          },
        },
      },
      "/api/v1/alerts": {
        get: {
          tags: ["Operations", "Readings"],
          summary: "List abnormal readings",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              in: "query",
              name: "limit",
              schema: { type: "integer", default: 100 },
            },
          ],
          responses: {
            200: {
              description: "Alert reading list",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/SuccessEnvelopeReadings" },
                },
              },
            },
          },
        },
      },
    },
  };
}
