import api from "./api";

export async function getFadesolServices() {
  const response = await api.get("/services-fadesol/");

  return response.data;
}
