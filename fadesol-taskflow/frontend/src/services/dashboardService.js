import api from "./api";

export async function getDashboardStatistics() {
  const response = await api.get("/dashboard/statistics");

  return response.data;
}

export async function getServicesOverview() {
  const response = await api.get("/dashboard/services-overview");

  return response.data;
}

export async function getServiceDashboard(serviceId) {
  const response = await api.get(`/dashboard/service/${serviceId}`);

  return response.data;
}

export async function getMembersWorkload(filters = {}) {
  const params = {};

  if (filters.service_id) {
    params.service_id = filters.service_id;
  }

  if (filters.search) {
    params.search = filters.search;
  }

  const response = await api.get("/dashboard/members-workload", { params });

  return response.data;
}
