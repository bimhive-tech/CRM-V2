import { apiRequest } from "@/lib/api/client";

export function loginUser(credentials) {
  return apiRequest("/auth/login/", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

export function getCurrentUser(token) {
  return apiRequest("/auth/me/", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function refreshAccessToken(refresh) {
  return apiRequest("/auth/refresh/", {
    method: "POST",
    body: JSON.stringify({ refresh }),
  });
}
