import api from "./api";

export async function getClickUpSpaces() {
  const response = await api.get("/clickup/spaces");
  return response.data;
}

export async function getClickUpFolders(spaceId) {
  const response = await api.get("/clickup/folders", {
    params: spaceId ? { space_id: spaceId } : {},
  });
  return response.data;
}

export async function getClickUpLists({ folderId, spaceId } = {}) {
  const response = await api.get("/clickup/lists", {
    params: {
      ...(folderId ? { folder_id: folderId } : {}),
      ...(spaceId ? { space_id: spaceId } : {}),
    },
  });
  return response.data;
}

export async function getClickUpStructure() {
  const response = await api.get("/clickup/structure");
  return response.data;
}
