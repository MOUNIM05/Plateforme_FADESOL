import axios from "axios";

const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: `${apiBaseUrl.replace(/\/$/, "")}/api`,
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

console.log("Axios base URL:", `${apiBaseUrl.replace(/\/$/, "")}/api`);

export default api;
