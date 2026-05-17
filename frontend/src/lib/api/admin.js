import { apiRequest } from "@/lib/api/client";

function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
  };
}

export function listCompanies(token) {
  return apiRequest("/companies/", {
    method: "GET",
    headers: authHeaders(token),
  });
}

export function createCompany(token, payload) {
  return apiRequest("/companies/", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
}

export function updateCompany(token, companyId, payload) {
  return apiRequest(`/companies/${companyId}/`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
}

export function deleteCompany(token, companyId) {
  return apiRequest(`/companies/${companyId}/`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
}

export function listUsers(token) {
  return apiRequest("/auth/users/", {
    method: "GET",
    headers: authHeaders(token),
  });
}

export function listRoles(token) {
  return apiRequest("/auth/roles/", {
    method: "GET",
    headers: authHeaders(token),
  });
}

export function createRole(token, payload) {
  return apiRequest("/auth/roles/", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
}

export function updateRole(token, roleId, payload) {
  return apiRequest(`/auth/roles/${roleId}/`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
}

export function deleteRole(token, roleId) {
  return apiRequest(`/auth/roles/${roleId}/`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
}

export function createUser(token, payload) {
  return apiRequest("/auth/users/", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
}

export function updateUser(token, userId, payload) {
  return apiRequest(`/auth/users/${userId}/`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
}

export function deleteUser(token, userId) {
  return apiRequest(`/auth/users/${userId}/`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
}
