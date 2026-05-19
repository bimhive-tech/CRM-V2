import { apiRequest, buildApiPath } from "@/lib/api/client";

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

export function listCrmCompanies(token, query = {}) {
  return apiRequest(buildApiPath("/crm-companies/", query), {
    method: "GET",
    headers: authHeaders(token),
  });
}

export function createCrmCompany(token, payload) {
  return apiRequest("/crm-companies/", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
}

export function getCrmCompany(token, companyId) {
  return apiRequest(`/crm-companies/${companyId}/`, {
    method: "GET",
    headers: authHeaders(token),
  });
}

export function updateCrmCompany(token, companyId, payload) {
  return apiRequest(`/crm-companies/${companyId}/`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
}

export function deleteCrmCompany(token, companyId) {
  return apiRequest(`/crm-companies/${companyId}/`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
}

export function uploadCompanyLogo(token, companyId, file) {
  const body = new FormData();
  body.append("logo", file);

  return apiRequest(`/companies/${companyId}/logo/`, {
    method: "POST",
    headers: authHeaders(token),
    body,
  });
}

export function deleteCompanyLogo(token, companyId) {
  return apiRequest(`/companies/${companyId}/logo/`, {
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

export function listCurrencies(token, query = {}) {
  return apiRequest(buildApiPath("/master-data/currencies/", query), {
    method: "GET",
    headers: authHeaders(token),
  });
}

export function listCompanyIndustries(token, query = {}) {
  return apiRequest(buildApiPath("/master-data/company-industries/", query), {
    method: "GET",
    headers: authHeaders(token),
  });
}

export function createCompanyIndustry(token, payload, query = {}) {
  return apiRequest(buildApiPath("/master-data/company-industries/", query), {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
}

export function updateCompanyIndustry(token, industryId, payload) {
  return apiRequest(`/master-data/company-industries/${industryId}/`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
}

export function deleteCompanyIndustry(token, industryId) {
  return apiRequest(`/master-data/company-industries/${industryId}/`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
}

export function restoreDefaultCompanyIndustries(token, query = {}) {
  return apiRequest(buildApiPath("/master-data/company-industries/restore-defaults/", query), {
    method: "POST",
    headers: authHeaders(token),
  });
}

export function createCurrency(token, payload, query = {}) {
  return apiRequest(buildApiPath("/master-data/currencies/", query), {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
}

export function updateCurrency(token, currencyId, payload) {
  return apiRequest(`/master-data/currencies/${currencyId}/`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
}

export function deleteCurrency(token, currencyId) {
  return apiRequest(`/master-data/currencies/${currencyId}/`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
}

export function restoreDefaultCurrencies(token, query = {}) {
  return apiRequest(buildApiPath("/master-data/currencies/restore-defaults/", query), {
    method: "POST",
    headers: authHeaders(token),
  });
}

export function listPipelineStatusTemplates(token, query = {}) {
  return apiRequest(buildApiPath("/master-data/pipeline-status-templates/", query), {
    method: "GET",
    headers: authHeaders(token),
  });
}

export function createPipelineStatusTemplate(token, payload, query = {}) {
  return apiRequest(buildApiPath("/master-data/pipeline-status-templates/", query), {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
}

export function updatePipelineStatusTemplate(token, templateId, payload) {
  return apiRequest(`/master-data/pipeline-status-templates/${templateId}/`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
}

export function deletePipelineStatusTemplate(token, templateId) {
  return apiRequest(`/master-data/pipeline-status-templates/${templateId}/`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
}

export function restoreDefaultPipelineStatusTemplates(token, query = {}) {
  return apiRequest(buildApiPath("/master-data/pipeline-status-templates/restore-defaults/", query), {
    method: "POST",
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

export function listContacts(token, query = {}) {
  return apiRequest(buildApiPath("/contacts/", query), {
    method: "GET",
    headers: authHeaders(token),
  });
}

export function createContact(token, payload) {
  return apiRequest("/contacts/", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
}

export function getContact(token, contactId) {
  return apiRequest(`/contacts/${contactId}/`, {
    method: "GET",
    headers: authHeaders(token),
  });
}

export function updateContact(token, contactId, payload) {
  return apiRequest(`/contacts/${contactId}/`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
}

export function deleteContact(token, contactId) {
  return apiRequest(`/contacts/${contactId}/`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
}

export function previewContactImport(token, file) {
  const body = new FormData();
  body.append("file", file);

  return apiRequest("/contacts/import/preview/", {
    method: "POST",
    headers: authHeaders(token),
    body,
  });
}

export function executeContactImport(token, file, mapping) {
  return executeContactImportWithPipeline(token, file, mapping, "");
}

export function executeContactImportWithPipeline(token, file, mapping, pipelineId) {
  const body = new FormData();
  body.append("file", file);
  body.append("mapping", JSON.stringify(mapping || {}));
  if (pipelineId) {
    body.append("pipeline_id", String(pipelineId));
  }

  return apiRequest("/contacts/import/execute/", {
    method: "POST",
    headers: authHeaders(token),
    body,
  });
}

export function deleteImportedContactData(token) {
  return apiRequest("/contacts/import/delete-imported/", {
    method: "POST",
    headers: authHeaders(token),
  });
}

export function listPipelines(token) {
  return apiRequest("/pipelines/", {
    method: "GET",
    headers: authHeaders(token),
  });
}

export function listDeals(token, query = {}) {
  return apiRequest(buildApiPath("/deals/", query), {
    method: "GET",
    headers: authHeaders(token),
  });
}

export function createDeal(token, payload) {
  return apiRequest("/deals/", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
}

export function updateDeal(token, dealId, payload) {
  return apiRequest(`/deals/${dealId}/`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
}

export function deleteDeal(token, dealId) {
  return apiRequest(`/deals/${dealId}/`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
}

export function createPipeline(token, payload) {
  return apiRequest("/pipelines/", {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
}

export function updatePipeline(token, pipelineId, payload) {
  return apiRequest(`/pipelines/${pipelineId}/`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
}

export function deletePipeline(token, pipelineId) {
  return apiRequest(`/pipelines/${pipelineId}/`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
}

export function createPipelineStatus(token, pipelineId, payload) {
  return apiRequest(`/pipelines/${pipelineId}/statuses/`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
}

export function updatePipelineStatus(token, statusId, payload) {
  return apiRequest(`/pipelines/statuses/${statusId}/`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
}

export function deletePipelineStatus(token, statusId) {
  return apiRequest(`/pipelines/statuses/${statusId}/`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
}
