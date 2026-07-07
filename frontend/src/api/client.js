const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

export async function apiRequest(path, options = {}) {
  const { token, headers, body, ...rest } = options;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    ...(body ? { body: typeof body === "string" ? body : JSON.stringify(body) } : {}),
  });

  if (response.status === 204) {
    return null;
  }

  const payload = await response.json();

  if (!response.ok) {
    const error = new Error(payload?.error?.message || "Request failed");
    error.status = response.status;
    error.details = payload?.error?.details;
    throw error;
  }

  return payload.data;
}
