import { clearSession, getRefreshToken, updateAccessToken } from "@/lib/session";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "/api";

let refreshPromise = null;

async function refreshSessionToken() {
  const refresh = getRefreshToken();
  if (!refresh) {
    throw new Error("No refresh token available.");
  }

  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE_URL}/auth/refresh/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh }),
      cache: "no-store",
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data?.access) {
          throw new Error(data?.detail || "Unable to refresh session.");
        }
        updateAccessToken(data.access);
        return data.access;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

export function buildApiPath(path, query = {}) {
  const searchParams = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }
    searchParams.set(key, String(value));
  });

  const queryString = searchParams.toString();
  return queryString ? `${path}?${queryString}` : path;
}

export async function apiRequest(path, options = {}, retry = true) {
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(options.headers || {}),
    },
    cache: "no-store",
  });

  if (response.status === 401 && retry && path !== "/auth/login/" && path !== "/auth/refresh/") {
    try {
      const nextAccessToken = await refreshSessionToken();
      const nextHeaders = { ...(options.headers || {}), Authorization: `Bearer ${nextAccessToken}` };
      return apiRequest(path, { ...options, headers: nextHeaders }, false);
    } catch {
      clearSession();
    }
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const fieldError =
      Object.entries(data || {}).find(([key, value]) => key !== "detail" && Array.isArray(value) && value.length)?.[1]?.[0] ||
      Object.entries(data || {}).find(([key, value]) => key !== "detail" && typeof value === "string")?.[1];
    const detail =
      data?.detail ||
      fieldError ||
      data?.email?.[0] ||
      data?.password?.[0] ||
      data?.full_name?.[0] ||
      data?.title?.[0] ||
      data?.name?.[0] ||
      "Request failed.";
    throw new Error(detail);
  }

  return data;
}
