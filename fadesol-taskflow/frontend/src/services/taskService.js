import api from "./api";

export async function createTask(taskData) {
  const response = await api.post("/tasks/", taskData);

  return response.data;
}

export async function getTasks(filters = {}) {
  const params = Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== undefined && value !== null && value !== "")
  );
  const response = await api.get("/tasks/", { params });

  return response.data;
}

export async function assignTask(taskId, assignedTo) {
  const response = await api.patch(`/tasks/${taskId}/assign`, {
    assigned_to: assignedTo,
  });

  return response.data;
}

export async function updateTaskStatus(taskId, status) {
  const response = await api.patch(`/tasks/${taskId}/status`, {
    status,
  });

  return response.data;
}
