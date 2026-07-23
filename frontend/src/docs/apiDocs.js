import { ADMIN_AUTH_HEADER } from "../constants/auth";

export const apiDocSections = [
  {
    title: "Authentication",
    description: "Fixed admin bearer token for the dashboard and protected mobile APIs.",
    endpoints: [
      {
        method: "POST",
        path: "/api/v1/admin/login",
        auth: "Public",
        summary: "Compatibility login that returns the fixed admin bearer token.",
        body: {
          username: "admin",
          password: "admin",
        },
      },
      {
        method: "POST",
        path: "/api/v1/admin/logout",
        auth: "Bearer token",
        summary: "Invalidate the current admin session on the client side.",
      },
      {
        method: "GET",
        path: "/api/v1/admin/me",
        auth: "Bearer token",
        summary: "Return the current admin identity for the fixed bearer token.",
        body: {
          Authorization: ADMIN_AUTH_HEADER,
        },
      },
    ],
  },
  {
    title: "Users",
    description: "User-first access to the MongoDB surveillance data model.",
    endpoints: [
      {
        method: "GET",
        path: "/api/v1/users",
        auth: "Bearer token",
        summary: "List user IDs available in the dataset.",
      },
      {
        method: "GET",
        path: "/api/v1/users/{userId}/dashboard/summary",
        auth: "Bearer token",
        summary: "Dashboard summary for one user.",
      },
      {
        method: "GET",
        path: "/api/v1/users/{userId}/devices",
        auth: "Bearer token",
        summary: "List devices for one user.",
      },
      {
        method: "GET",
        path: "/api/v1/users/{userId}/devices/{nodeId}",
        auth: "Bearer token",
        summary: "Get one device for one user.",
      },
    ],
  },
  {
    title: "Readings",
    description: "Read and ingest environmental readings for users and nodes.",
    endpoints: [
      {
        method: "GET",
        path: "/api/v1/users/{userId}/environmental-data",
        auth: "Bearer token",
        summary: "List readings for one user. Use this user-scoped path instead of /api/v1/environmental-data/{userId}.",
        body: {
          note: "Optional query params: nodeId, from, to, abnormal, limit",
        },
      },
      {
        method: "GET",
        path: "/api/v1/users/{userId}/environmental-data/{nodeId}/history",
        auth: "Bearer token",
        summary: "Read history for one user node.",
      },
      {
        method: "POST",
        path: "/api/v1/users/{userId}/environmental-data/{nodeId}",
        auth: "Public",
        summary: "Legacy-style ingest using path params. Omit timestamp to use server system time.",
        body: {
          temperature: 27.4,
          humidity: 74,
          aqi: 36,
          timestamp: 1733011200000,
        },
      },
      {
        method: "POST",
        path: "/api/v1/environmental-data",
        auth: "Public",
        summary: "Body-based ingest with userId/user_id; nodeId is optional and auto-generated when omitted. Omit timestamp to use server system time.",
        body: {
          user_id: "34dbNI5JJ9QqZl49vqWsPhxjbf72",
          temperature: 27.4,
          humidity: 74,
          aqi: 36,
          timestamp: 1733011200000,
        },
      },
    ],
  },
  {
    title: "Operations",
    description: "Supporting endpoints used by the admin dashboard.",
    endpoints: [
      {
        method: "GET",
        path: "/api/v1/health",
        auth: "Public",
        summary: "Check API health and storage provider.",
      },
      {
        method: "GET",
        path: "/api/v1/alerts?limit=200",
        auth: "Bearer token",
        summary: "List abnormal readings.",
      },
      {
        method: "GET",
        path: "/api/v1/environmental-data/latest",
        auth: "Bearer token",
        summary: "Latest readings across all devices.",
      },
    ],
  },
];
