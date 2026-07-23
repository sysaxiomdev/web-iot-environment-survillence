import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { apiRequest } from "../api/client";

const AuthContext = createContext(null);
const TOKEN_KEY = "env-surveillance-admin-token";
const ADMIN_KEY = "env-surveillance-admin-profile";
const LEGACY_SESSION_KEY = "env-surveillance-admin-session";

function readStoredAdmin() {
  try {
    const stored = localStorage.getItem(ADMIN_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || "");
  const [admin, setAdmin] = useState(() => readStoredAdmin());
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem(TOKEN_KEY)));

  const clearStoredSession = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ADMIN_KEY);
    localStorage.removeItem(LEGACY_SESSION_KEY);
    setToken("");
    setAdmin(null);
  }, []);

  useEffect(() => {
    if (!token) {
      setAdmin(null);
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);

    apiRequest("/api/v1/admin/me", { token })
      .then((profile) => {
        if (!cancelled) {
          localStorage.setItem(ADMIN_KEY, JSON.stringify(profile));
          setAdmin(profile);
        }
      })
      .catch((error) => {
        if (!cancelled && error.status === 401) {
          clearStoredSession();
        }
        // Keep the stored session on other failures. A network hiccup should not force a fresh login.
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [clearStoredSession, token]);

  async function login(credentials) {
    const result = await apiRequest("/api/v1/admin/login", {
      method: "POST",
      body: credentials,
    });

    localStorage.setItem(TOKEN_KEY, result.token);
    localStorage.setItem(ADMIN_KEY, JSON.stringify(result.admin));
    localStorage.removeItem(LEGACY_SESSION_KEY);
    setLoading(false);
    setToken(result.token);
    setAdmin(result.admin);
    return result.admin;
  }

  const logout = useCallback(async () => {
    try {
      if (token) {
        await apiRequest("/api/v1/admin/logout", {
          method: "POST",
          token,
        });
      }
    } catch (error) {
      // The local session is still cleared if the network request fails.
    }

    clearStoredSession();
  }, [clearStoredSession, token]);

  return (
    <AuthContext.Provider
      value={{
        admin,
        token,
        isAuthenticated: Boolean(token && admin),
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
