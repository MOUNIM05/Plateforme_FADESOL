import api, { resolveApiUrl } from "./api";

export async function getServices() {
  const endpoint = "/services/";

  console.info("[Services API] GET", resolveApiUrl(endpoint));
  const response = await api.get(endpoint);

  return response.data;
}
