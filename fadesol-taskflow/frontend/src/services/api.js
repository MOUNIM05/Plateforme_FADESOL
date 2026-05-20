import axios from "axios";

const apiBaseUrl =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8003/api";

export const API_BASE_URL = apiBaseUrl.replace(/\/$/, "");

const api = axios.create({
  baseURL: API_BASE_URL.endsWith("/api") ? API_BASE_URL : `${API_BASE_URL}/api`,
  timeout: 8000,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;
