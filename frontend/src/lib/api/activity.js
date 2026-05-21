import { apiRequest, buildApiPath } from "@/lib/api/client";

function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
  };
}

export function listAuditLog(token, query = {}) {
  return apiRequest(buildApiPath("/activity/", query), {
    method: "GET",
    headers: authHeaders(token),
  });
}

export function createAuditLogEntry(token, payload) {
  return apiRequest("/activity/", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
}

