// Service API des tableaux de bord : statistiques, analytics et charge equipe.
import api from "./api";

export async function getDashboardStatistics() {
  // KPIs principaux utilises par les dashboards Admin et Manager.
  const response = await api.get("/dashboard/statistics");

  return response.data;
}

export async function getDashboardAnalytics() {
  // Donnees agregees pour les graphiques de repartition et de progression.
  const response = await api.get("/dashboard/analytics");

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
  // Les filtres restent optionnels pour conserver la vue globale par defaut.
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
