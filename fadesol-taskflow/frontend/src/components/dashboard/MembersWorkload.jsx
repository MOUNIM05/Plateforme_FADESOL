import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Search,
  UserRound,
  Workflow,
} from "lucide-react";
import { getMembersWorkload } from "../../services/dashboardService";
import { DATA_EVENTS, subscribeDataEvents } from "../../utils/dataEvents";

const fallbackMembers = [];

function MembersWorkload() {
  const [members, setMembers] = useState(fallbackMembers);
  const [serviceFilter, setServiceFilter] = useState("");
  const [search, setSearch] = useState("");
  const [serviceOptions, setServiceOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [warning, setWarning] = useState("");

  const loadMembersWorkload = useCallback(async ({ showLoading = true } = {}) => {
    if (showLoading) {
      setLoading(true);
    }
    setWarning("");

    try {
      const data = await getMembersWorkload({
        service_id: serviceFilter,
        search: search.trim(),
      });
      const memberData = Array.isArray(data) ? data : fallbackMembers;
      setMembers(memberData);
      setServiceOptions((current) => mergeServiceOptions(current, memberData));
    } catch (error) {
      console.error("Members workload dashboard error:", error);
      setMembers(fallbackMembers);
      setWarning("Charge de travail temporairement indisponible.");
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, [search, serviceFilter]);

  useEffect(() => {
    loadMembersWorkload();
  }, [loadMembersWorkload]);

  useEffect(() => {
    return subscribeDataEvents(
      [DATA_EVENTS.USERS_CHANGED, DATA_EVENTS.TASKS_CHANGED, DATA_EVENTS.SERVICES_CHANGED],
      () => loadMembersWorkload({ showLoading: false })
    );
  }, [loadMembersWorkload]);

  const summary = useMemo(() => {
    return members.reduce(
      (accumulator, member) => ({
        totalMembers: accumulator.totalMembers + 1,
        totalTasks: accumulator.totalTasks + Number(member.total_tasks || 0),
        overdueTasks: accumulator.overdueTasks + Number(member.overdue_tasks || 0),
        completedTasks: accumulator.completedTasks + Number(member.completed_tasks || 0),
      }),
      { totalMembers: 0, totalTasks: 0, overdueTasks: 0, completedTasks: 0 }
    );
  }, [members]);

  const chartMembers = useMemo(() => {
    return [...members]
      .sort((first, second) => Number(second.total_tasks || 0) - Number(first.total_tasks || 0))
      .slice(0, 6);
  }, [members]);

  const maxTasks = Math.max(1, ...chartMembers.map((member) => Number(member.total_tasks || 0)));

  return (
    <section className="members-workload-section" aria-label="Charge de travail par membre">
      <div className="card-header">
        <div>
          <h2>Charge de travail par membre</h2>
        </div>
      </div>

      {warning && <p className="notice warning">{warning}</p>}

      <div className="members-workload-summary" aria-label="Résumé charge membres">
        <div>
          <UserRound size={17} />
          <span>Membres</span>
          <strong>{loading ? "..." : summary.totalMembers}</strong>
        </div>
        <div>
          <Workflow size={17} />
          <span>Total tâches</span>
          <strong>{loading ? "..." : summary.totalTasks}</strong>
        </div>
        <div>
          <CheckCircle2 size={17} />
          <span>Terminées</span>
          <strong>{loading ? "..." : summary.completedTasks}</strong>
        </div>
        <div>
          <AlertTriangle size={17} />
          <span>En retard</span>
          <strong>{loading ? "..." : summary.overdueTasks}</strong>
        </div>
      </div>

      <div className="members-workload-grid">
        <section className="dashboard-card members-workload-table-card">
          <div className="members-workload-toolbar">
            <label className="search-field">
              <Search size={16} />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher membre"
              />
            </label>

            <select value={serviceFilter} onChange={(event) => setServiceFilter(event.target.value)}>
              <option value="">Tous les services</option>
              {serviceOptions.map((service) => (
                <option key={service.service_id} value={service.service_id}>
                  {service.service_name}
                </option>
              ))}
            </select>
          </div>

          <div className="members-workload-table">
            <div className="members-workload-table__head">
              <span>Membre</span>
              <span>Service</span>
              <span>Tâches</span>
              <span>Retard</span>
              <span>Terminées</span>
              <span>En cours</span>
              <span>Bloquées</span>
              <span>Progrès</span>
            </div>

            {loading ? (
              <div className="members-workload-empty">Chargement des charges...</div>
            ) : members.length ? (
              members.map((member) => (
                <article key={member.member_id} className="members-workload-table__row">
                  <div>
                    <strong>{member.full_name}</strong>
                    <small>{member.email}</small>
                  </div>
                  <span>{member.service_name}</span>
                  <span>{member.total_tasks}</span>
                  <span className={member.overdue_tasks > 0 ? "is-alert" : ""}>{member.overdue_tasks}</span>
                  <span>{member.completed_tasks}</span>
                  <span>{member.in_progress_tasks}</span>
                  <span>{member.blocked_tasks}</span>
                  <div>
                    <div className="progress-bar">
                      <i style={{ width: `${member.progression || 0}%` }} />
                    </div>
                    <em>{member.progression || 0}%</em>
                  </div>
                </article>
              ))
            ) : (
              <div className="members-workload-empty">Aucun membre trouvé.</div>
            )}
          </div>
        </section>

        <section className="dashboard-card members-workload-chart-card">
          <div className="card-header">
            <div>
              <h2>Répartition des tâches</h2>
              <p>Top membres par volume assigné.</p>
            </div>
            <BarChart3 size={20} />
          </div>

          <div className="members-workload-chart">
            {loading ? (
              <div className="members-workload-empty">Chargement du graphique...</div>
            ) : chartMembers.length ? (
              chartMembers.map((member) => {
                const taskCount = Number(member.total_tasks || 0);
                const width = Math.max(4, Math.round((taskCount / maxTasks) * 100));

                return (
                  <div key={member.member_id}>
                    <span>{member.full_name}</span>
                    <div>
                      <i style={{ width: `${width}%` }} />
                    </div>
                    <strong>{taskCount}</strong>
                  </div>
                );
              })
            ) : (
              <div className="members-workload-empty">Aucune tâche assignée.</div>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}

function mergeServiceOptions(currentOptions, members) {
  const optionsById = new Map(currentOptions.map((service) => [String(service.service_id), service]));

  members.forEach((member) => {
    if (!member.service_id) {
      return;
    }

    optionsById.set(String(member.service_id), {
      service_id: String(member.service_id),
      service_name: member.service_name || String(member.service_id),
    });
  });

  return [...optionsById.values()].sort((first, second) =>
    first.service_name.localeCompare(second.service_name)
  );
}

export default MembersWorkload;
