import api, { resolveApiUrl } from "./api";

export async function getServices() {
  const endpoint = "/services/";

  console.info("[Services API] GET", resolveApiUrl(endpoint));
  const response = await api.get(endpoint);

  return response.data;
}

export async function createService(data) {
  const endpoint = "/services/";

  console.info("[Services API] POST", resolveApiUrl(endpoint));
  const response = await api.post(endpoint, data);

  return response.data;
}

export async function deleteService(serviceId) {
  const endpoint = `/services/${serviceId}`;

  console.info("[Services API] DELETE", resolveApiUrl(endpoint));
  const response = await api.delete(endpoint);

  return response.data;
}
