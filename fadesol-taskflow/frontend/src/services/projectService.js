import api, { resolveApiUrl } from "./api";

export async function getProjects(filters = {}) {
  const endpoint = "/projects/";
  const params = {};

  if (filters.service_id) {
    params.service_id = filters.service_id;
  }

  if (filters.status) {
    params.status = filters.status;
  }

  console.info("[Projects API] GET", resolveApiUrl(endpoint));
  const response = await api.get(endpoint, { params });

  return response.data;
}

export async function getProject(projectId) {
  const endpoint = `/projects/${projectId}`;

  console.info("[Projects API] GET", resolveApiUrl(endpoint));
  const response = await api.get(endpoint);

  return response.data;
}

export async function createProject(projectData) {
  const endpoint = "/projects/";

  console.info("[Projects API] POST", resolveApiUrl(endpoint));
  const response = await api.post(endpoint, projectData);

  return response.data;
}

export async function updateProject(projectId, projectData) {
  const endpoint = `/projects/${projectId}`;

  console.info("[Projects API] PUT", resolveApiUrl(endpoint));
  const response = await api.put(endpoint, projectData);

  return response.data;
}

export async function deleteProject(projectId) {
  const endpoint = `/projects/${projectId}`;

  console.info("[Projects API] DELETE", resolveApiUrl(endpoint));
  const response = await api.delete(endpoint);

  return response.data;
}
