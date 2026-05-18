import { CalendarDays, RefreshCw } from "lucide-react";

function TaskCard({ task }) {
  return (
    <article className="tf-task-card">
      <div className="tf-task-card__header">
        <h4>{task.title}</h4>
        <span className={`priority priority--${task.priorityKey}`}>{task.priority}</span>
      </div>

      <p>{task.service}</p>

      <div className="tf-task-card__meta">
        <span className={`status status--${task.statusKey}`}>{task.status}</span>
        <span className="tf-sync-badge">
          <RefreshCw size={12} />
          ClickUp
        </span>
      </div>

      <div className="tf-task-card__footer">
        <span className="tf-mini-avatar">{task.assignee}</span>
        <span>
          <CalendarDays size={14} />
          {task.dueDate}
        </span>
      </div>
    </article>
  );
}

export default TaskCard;
