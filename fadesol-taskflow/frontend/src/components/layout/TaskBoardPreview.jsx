import TaskCard from "./TaskCard";

const columns = [
  { id: "todo", title: "À faire" },
  { id: "doing", title: "En cours" },
  { id: "blocked", title: "Bloqué" },
  { id: "done", title: "Terminé" },
];

const tasks = [
  {
    id: 1,
    column: "doing",
    title: "Préparer le rapport de conception",
    service: "Direction / RH / Administration",
    priority: "Haute",
    priorityKey: "high",
    status: "En cours",
    statusKey: "doing",
    assignee: "AM",
    dueDate: "Aujourd’hui",
  },
  {
    id: 2,
    column: "todo",
    title: "Valider la structure des services",
    service: "Technique",
    priority: "Urgente",
    priorityKey: "urgent",
    status: "À faire",
    statusKey: "todo",
    assignee: "TM",
    dueDate: "Demain",
  },
  {
    id: 3,
    column: "done",
    title: "Tester connexion utilisateur",
    service: "Technique",
    priority: "Normale",
    priorityKey: "normal",
    status: "Terminé",
    statusKey: "done",
    assignee: "QA",
    dueDate: "Hier",
  },
  {
    id: 4,
    column: "blocked",
    title: "Mettre a jour les priorites taches",
    service: "Commercial",
    priority: "Haute",
    priorityKey: "high",
    status: "Bloqué",
    statusKey: "blocked",
    assignee: "CM",
    dueDate: "Vendredi",
  },
];

function TaskBoardPreview() {
  return (
    <div className="tf-board-preview">
      {columns.map((column) => {
        const columnTasks = tasks.filter((task) => task.column === column.id);

        return (
          <section className="tf-board-column" key={column.id}>
            <header>
              <h3>{column.title}</h3>
              <span>{columnTasks.length}</span>
            </header>

            <div className="tf-board-column__cards">
              {columnTasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export default TaskBoardPreview;
