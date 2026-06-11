import { useCallback, useEffect, useMemo, useState } from "react";
import { getTasks } from "../../services/taskService";
import { DATA_EVENTS, subscribeDataEvents } from "../../utils/dataEvents";

const completedStatuses = new Set(["Terminé", "Termine", "Terminée", "Validée", "Validee", "DONE", "COMPLETED"]);

function startOfWeek(date) {
  const copy = new Date(date);
  const day = copy.getDay() || 7;
  copy.setHours(0, 0, 0, 0);
  copy.setDate(copy.getDate() - day + 1);
  return copy;
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function formatWeekLabel(start) {
  const end = addDays(start, 6);
  const formatter = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
  return `${formatter.format(start)} - ${formatter.format(end)}`;
}

function isSameWeek(dateValue, weekStart) {
  const date = new Date(dateValue);
  const weekEnd = addDays(weekStart, 7);
  return date >= weekStart && date < weekEnd;
}

function toPoints(values, max) {
  return values
    .map((value, index) => {
      const x = 42 + index * 128;
      const y = 205 - (value / max) * 170;
      return `${x},${y}`;
    })
    .join(" ");
}

function TaskEvolutionChart() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadTasksEvolution = useCallback(async ({ showLoading = true } = {}) => {
    if (showLoading) {
      setLoading(true);
    }

    try {
      const data = await getTasks();
      setTasks(Array.isArray(data) ? data : []);
      setError("");
    } catch (loadError) {
      console.error("Task evolution load error:", loadError);
      setTasks([]);
      setError("Évolution temporairement indisponible.");
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadTasksEvolution();
  }, [loadTasksEvolution]);

  useEffect(() => {
    return subscribeDataEvents([DATA_EVENTS.TASKS_CHANGED], () => {
      loadTasksEvolution({ showLoading: false });
    });
  }, [loadTasksEvolution]);

  const chartData = useMemo(() => {
    const currentWeek = startOfWeek(new Date());
    const weeks = Array.from({ length: 5 }, (_, index) => {
      const start = addDays(currentWeek, (index - 4) * 7);
      return {
        start,
        label: formatWeekLabel(start),
        created: 0,
        completed: 0,
      };
    });

    tasks.forEach((task) => {
      const createdAt = task.created_at || task.date_creation;
      const updatedAt = task.updated_at || task.date_modification || createdAt;

      weeks.forEach((week) => {
        if (createdAt && isSameWeek(createdAt, week.start)) {
          week.created += 1;
        }

        if (completedStatuses.has(task.status || task.statut) && updatedAt && isSameWeek(updatedAt, week.start)) {
          week.completed += 1;
        }
      });
    });

    return weeks;
  }, [tasks]);

  const created = chartData.map((week) => week.created);
  const completed = chartData.map((week) => week.completed);
  const max = Math.max(1, ...created, ...completed);

  return (
    <section className="dashboard-card task-evolution-card">
      <div className="card-header">
        <div>
          <h2>Évolution des tâches</h2>
          <p>{loading ? "Chargement des données..." : "Suivi hebdomadaire des tâches créées et terminées"}</p>
        </div>
        <div className="chart-legend">
          <span><i className="is-blue" /> Tâches créées</span>
          <span><i className="is-green" /> Tâches terminées</span>
        </div>
      </div>

      {error ? (
        <p className="loading-line compact">{error}</p>
      ) : (
        <div className="line-chart">
          <svg viewBox="0 0 600 250" role="img" aria-label="Évolution des tâches">
            <defs>
              <linearGradient id="createdGradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#2563eb" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="doneGradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#16a34a" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#16a34a" stopOpacity="0" />
              </linearGradient>
            </defs>
            {[40, 80, 120, 160, 200].map((y) => (
              <line key={y} x1="30" x2="570" y1={y} y2={y} className="chart-grid-line" />
            ))}
            <polyline points={`42,205 ${toPoints(created, max)} 554,205`} className="chart-area is-blue" />
            <polyline points={`42,205 ${toPoints(completed, max)} 554,205`} className="chart-area is-green" />
            <polyline points={toPoints(created, max)} className="chart-line is-blue-stroke" />
            <polyline points={toPoints(completed, max)} className="chart-line is-green-stroke" />
            {created.map((value, index) => (
              <circle key={`created-${chartData[index].label}`} cx={42 + index * 128} cy={205 - (value / max) * 170} r="5" className="chart-dot is-blue-dot" />
            ))}
            {completed.map((value, index) => (
              <circle key={`completed-${chartData[index].label}`} cx={42 + index * 128} cy={205 - (value / max) * 170} r="5" className="chart-dot is-green-dot" />
            ))}
          </svg>
          <div className="line-chart__labels">
            {chartData.map((week) => (
              <span key={week.label}>{week.label}</span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

export default TaskEvolutionChart;
