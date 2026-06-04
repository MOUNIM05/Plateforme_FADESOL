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

export async function getSubtasksByTask(taskId) {
  const response = await api.get(`/tasks/${taskId}/subtasks`);

  return response.data;
}

export async function createSubtask(taskId, subtaskData) {
  const response = await api.post(`/tasks/${taskId}/subtasks`, subtaskData);

  return response.data;
}

export async function assignSubtask(taskId, subtaskId, assignmentData) {
  const response = await api.patch(`/tasks/${taskId}/subtasks/${subtaskId}/assign`, assignmentData);

  return response.data;
}
