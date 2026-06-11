import { useCallback, useEffect, useState } from "react";
import { UsersRound } from "lucide-react";
import { getServiceDashboard, getServicesOverview } from "../../services/dashboardService";
import { DATA_EVENTS, subscribeDataEvents } from "../../utils/dataEvents";
import ServiceDashboardDetails from "./ServiceDashboardDetails";

const fallbackServices = [
  { service_id: "commercial", service_name: "Commercial" },
  { service_id: "technique", service_name: "Technique" },
  { service_id: "achat", service_name: "Achat" },
  { service_id: "magasin-stock", service_name: "Magasin / Stock" },
  { service_id: "comptabilite-management", service_name: "Comptabilité & Management" },
  { service_id: "direction-rh-administration", service_name: "Direction / RH / Administration" },
].map((service) => ({
  ...service,
  total_members: 0,
  total_projects: 0,
  total_tasks: 0,
  tasks_in_progress: 0,
  tasks_completed: 0,
  tasks_late: 0,
  tasks_blocked: 0,
  progress: 0,
}));

function ServicesOverview() {
  const [services, setServices] = useState(fallbackServices);
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedService, setSelectedService] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [warning, setWarning] = useState("");

  const loadServicesOverview = useCallback(async () => {
    setWarning("");

    try {
      const data = await getServicesOverview();
      const serviceData = Array.isArray(data) && data.length ? data : fallbackServices;
      setServices(serviceData);
      setSelectedServiceId((current) => current || serviceData[0]?.service_id || "");
    } catch (error) {
      console.error("Services dashboard overview error:", error);
      setServices(fallbackServices);
      setSelectedServiceId((current) => current || fallbackServices[0].service_id);
      setWarning("Dashboard par service temporairement indisponible.");
    }
  }, []);

  useEffect(() => {
    loadServicesOverview();
  }, [loadServicesOverview]);

  useEffect(() => {
    return subscribeDataEvents(
      [DATA_EVENTS.SERVICES_CHANGED, DATA_EVENTS.PROJECTS_CHANGED, DATA_EVENTS.TASKS_CHANGED, DATA_EVENTS.USERS_CHANGED],
      loadServicesOverview
    );
  }, [loadServicesOverview]);

  useEffect(() => {
    if (!selectedServiceId) {
      setSelectedService(null);
      return;
    }

    let isMounted = true;
    const fallback = services.find((service) => service.service_id === selectedServiceId) || null;

    setDetailLoading(true);
    setSelectedService(fallback ? { ...fallback, members: [] } : null);

    getServiceDashboard(selectedServiceId)
      .then((data) => {
        if (isMounted) {
          setSelectedService(data);
        }
      })
      .catch((error) => {
        console.error("Service dashboard detail error:", error);
        if (isMounted) {
          setSelectedService(fallback ? { ...fallback, members: [] } : null);
          setWarning("Dashboard par service temporairement indisponible.");
        }
      })
      .finally(() => {
        if (isMounted) {
          setDetailLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [selectedServiceId, services]);

  return (
    <section className="services-dashboard-section" aria-label="Dashboard par service">
      <div className="card-header">
        <div>
          <h2>Dashboard par service</h2>
        </div>
      </div>

      {warning && <p className="notice warning">{warning}</p>}

      <div className="services-dashboard-grid">
        <section className="dashboard-card services-overview-card">
          <div className="service-dashboard-table">
            <div className="service-dashboard-table__head">
              <span>Service</span>
              <span>Membres</span>
              <span>Tâches</span>
              <span>En cours</span>
              <span>Terminées</span>
              <span>Retard</span>
              <span>Bloquées</span>
              <span>Progrès</span>
            </div>

            {services.map((service) => (
              <button
                type="button"
                key={service.service_id}
                className={`service-dashboard-table__row ${selectedServiceId === service.service_id ? "is-selected" : ""}`}
                onClick={() => setSelectedServiceId(service.service_id)}
              >
                <strong>{service.service_name}</strong>
                <span><UsersRound size={14} />{service.total_members}</span>
                <span>{service.total_tasks}</span>
                <span>{service.tasks_in_progress}</span>
                <span>{service.tasks_completed}</span>
                <span>{service.tasks_late}</span>
                <span>{service.tasks_blocked}</span>
                <div>
                  <div className="progress-bar">
                    <i style={{ width: `${service.progress}%` }} />
                  </div>
                  <em>{service.progress}%</em>
                </div>
              </button>
            ))}
          </div>
        </section>

        <ServiceDashboardDetails service={selectedService} loading={detailLoading} />
      </div>
    </section>
  );
}

export default ServicesOverview;
