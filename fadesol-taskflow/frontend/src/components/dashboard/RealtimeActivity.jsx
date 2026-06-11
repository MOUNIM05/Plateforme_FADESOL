import { useEffect, useMemo, useState } from "react";
import { getMessages } from "../../services/messageService";
import { getProjects } from "../../services/projectService";
import { getTasks } from "../../services/taskService";
import { getUsers } from "../../services/userService";

function initials(name) {
  return String(name || "FT")
    .split(/[.\s@_-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

function getUserName(user) {
  return (
    [user?.prenom || user?.first_name, user?.nom || user?.last_name].filter(Boolean).join(" ") ||
    user?.email ||
    "Utilisateur"
  );
}

function timeAgo(value) {
  if (!value) {
    return "date inconnue";
  }

  const diffMs = Date.now() - new Date(value).getTime();
  const diffMinutes = Math.max(0, Math.round(diffMs / 60000));

  if (diffMinutes < 1) return "à l'instant";
  if (diffMinutes < 60) return `il y a ${diffMinutes} min`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `il y a ${diffHours} h`;

  const diffDays = Math.round(diffHours / 24);
  return `il y a ${diffDays} j`;
}

function RealtimeActivity() {
  const [messages, setMessages] = useState([]);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadActivity() {
      const [messageResult, projectResult, taskResult, userResult] = await Promise.allSettled([
        getMessages(),
        getProjects(),
        getTasks(),
        getUsers(),
      ]);

      if (!isMounted) return;

      setMessages(messageResult.status === "fulfilled" && Array.isArray(messageResult.value) ? messageResult.value : []);
      setProjects(projectResult.status === "fulfilled" && Array.isArray(projectResult.value) ? projectResult.value : []);
      setTasks(taskResult.status === "fulfilled" && Array.isArray(taskResult.value) ? taskResult.value : []);
      setUsers(userResult.status === "fulfilled" && Array.isArray(userResult.value) ? userResult.value : []);

      if ([messageResult, projectResult, taskResult].every((result) => result.status === "rejected")) {
        setError("Activité temporairement indisponible.");
      } else {
        setError("");
      }
    }

    loadActivity().finally(() => {
      if (isMounted) setLoading(false);
    });

    const intervalId = window.setInterval(loadActivity, 30000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const activities = useMemo(() => {
    const userById = users.reduce((accumulator, user) => {
      accumulator[String(user.id)] = user;
      accumulator[String(user.uuid)] = user;
      return accumulator;
    }, {});

    const messageActivities = messages.map((message) => {
      const user = userById[String(message.expediteur_id)];
      return {
        id: `message-${message.id}`,
        actor: getUserName(user),
        action: `a envoyé un message: "${String(message.contenu || "").slice(0, 48)}"`,
        date: message.date_creation,
      };
    });

    const projectActivities = projects.map((project) => ({
      id: `project-${project.id}`,
      actor: "Projet",
      action: `créé ou mis à jour: "${project.titre}"`,
      date: project.date_modification || project.date_creation,
    }));

    const taskActivities = tasks.map((task) => ({
      id: `task-${task.id}`,
      actor: "Tâche",
      action: `${task.status || task.statut || "statut"}: "${task.title || task.titre}"`,
      date: task.updated_at || task.created_at || task.date_creation,
    }));

    return [...messageActivities, ...projectActivities, ...taskActivities]
      .filter((activity) => activity.date)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);
  }, [messages, projects, tasks, users]);

  return (
    <section className="dashboard-card realtime-card">
      <div className="card-header">
        <div>
          <h2>Activité en temps réel</h2>
          <p>{loading ? "Chargement..." : "Dernières actions de l'organisation"}</p>
        </div>
      </div>

      <div className="realtime-list">
        {error && <p className="loading-line compact">{error}</p>}
        {!error && activities.length === 0 && <p className="loading-line compact">Aucune activité récente.</p>}
        {!error && activities.map((activity) => (
          <article key={activity.id}>
            <div className="activity-avatar">{initials(activity.actor)}</div>
            <div>
              <p><strong>{activity.actor}</strong> {activity.action}</p>
              <span>{timeAgo(activity.date)}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default RealtimeActivity;
