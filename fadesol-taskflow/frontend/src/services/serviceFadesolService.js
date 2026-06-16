import api from "./api";

function extractServices(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  if (Array.isArray(payload?.services)) {
    return payload.services;
  }

  return [];
}

export async function getFadesolServices() {
  const response = await api.get("/services-fadesol/");

  return extractServices(response.data);
}

export async function getFadesolServiceDetails(serviceId) {
  const response = await api.get(`/services-fadesol/${serviceId}/details`);

  return response.data;
}

export function getFadesolServiceLabel(service) {
  return service?.nom || service?.nom_service || service?.name || service?.libelle || service?.id || service?.uuid || "";
}

export function getFadesolServiceValue(service) {
  return String(service?.id || service?.uuid || service?.nom || service?.nom_service || service?.name || service?.libelle || "");
}
