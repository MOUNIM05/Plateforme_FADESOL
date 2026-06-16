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

export async function getTask(taskId) {
  const response = await api.get(`/tasks/${taskId}`);

  return response.data;
}

export async function updateTask(taskId, taskData) {
  const response = await api.put(`/tasks/${taskId}`, taskData);

  return response.data;
}

export async function deleteTask(taskId) {
  const response = await api.delete(`/tasks/${taskId}`);

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

export async function getTaskProgress(taskId) {
  const response = await api.get(`/tasks/${taskId}/progress`);

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

export async function getTaskAttachments(taskId) {
  const response = await api.get(`/tasks/${taskId}/attachments`);

  return response.data;
}

export async function uploadTaskAttachment(taskId, file) {
  const formData = new FormData();
  formData.append("file", file);
  const response = await api.post(`/tasks/${taskId}/attachments`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return response.data;
}

export async function deleteTaskAttachment(taskId, attachmentId) {
  const response = await api.delete(`/tasks/${taskId}/attachments/${attachmentId}`);

  return response.data;
}

export async function getSubtaskAttachments(taskId, subtaskId) {
  const response = await api.get(`/tasks/${taskId}/subtasks/${subtaskId}/attachments`);

  return response.data;
}

export async function uploadSubtaskAttachment(taskId, subtaskId, file) {
  const formData = new FormData();
  formData.append("file", file);
  const response = await api.post(`/tasks/${taskId}/subtasks/${subtaskId}/attachments`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return response.data;
}

export async function deleteSubtaskAttachment(taskId, subtaskId, attachmentId) {
  const response = await api.delete(`/tasks/${taskId}/subtasks/${subtaskId}/attachments/${attachmentId}`);

  return response.data;
}
