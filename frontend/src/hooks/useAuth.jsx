import { createContext, useContext, useEffect, useState } from "react";
import { apiRequest } from "../api/client";
import { ADMIN_BEARER_TOKEN, DEFAULT_ADMIN_PROFILE } from "../constants/auth";

const AuthContext = createContext(null);
const SESSION_KEY = "env-surveillance-admin-session";

export function AuthProvider({ children }) {
  const token = ADMIN_BEARER_TOKEN;
  const [sessionActive, setSessionActive] = useState(
    () => localStorage.getItem(SESSION_KEY) !== "false",
  );
  const [admin, setAdmin] = useState(
    sessionActive ? DEFAULT_ADMIN_PROFILE : null,
  );
  const [loading, setLoading] = useState(sessionActive);

  useEffect(() => {
    if (!sessionActive) {
      setAdmin(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    apiRequest("/api/v1/admin/me", { token })
      .then((profile) => {
        if (!cancelled) {
          setAdmin(profile);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAdmin(DEFAULT_ADMIN_PROFILE);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [sessionActive, token]);

  async function login() {
    const profile = await apiRequest("/api/v1/admin/me", { token });
    localStorage.setItem(SESSION_KEY, "true");
    setSessionActive(true);
    setAdmin(profile);
    return profile;
  }

  async function logout() {
    try {
      await apiRequest("/api/v1/admin/logout", {
        method: "POST",
        token,
      });
    } catch (error) {
      // Static token auth stays available even if the API call fails.
    }

    localStorage.setItem(SESSION_KEY, "false");
    setSessionActive(false);
    setAdmin(null);
  }

  return (
    <AuthContext.Provider
      value={{
        admin,
        token,
        isAuthenticated: sessionActive && Boolean(token),
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
