import { useEffect, useMemo, useState } from "react";
import { FolderKanban, ListChecks, RefreshCw, Rows3 } from "lucide-react";
import {
  getClickUpFolders,
  getClickUpLists,
  getClickUpSpaces,
  getClickUpStructure,
} from "../services/clickupService";

function EmptyMessage({ children }) {
  return <p className="clickup-empty">{children}</p>;
}

function ClickUpIntegration() {
  const [spaces, setSpaces] = useState([]);
  const [folders, setFolders] = useState([]);
  const [folderLists, setFolderLists] = useState([]);
  const [folderlessLists, setFolderlessLists] = useState([]);
  const [structure, setStructure] = useState(null);
  const [selectedSpaceId, setSelectedSpaceId] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState("");
  const [loadingSpaces, setLoadingSpaces] = useState(false);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [loadingLists, setLoadingLists] = useState(false);
  const [loadingStructure, setLoadingStructure] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const selectedSpace = useMemo(
    () => spaces.find((space) => space.id === selectedSpaceId),
    [spaces, selectedSpaceId],
  );

  const selectedFolder = useMemo(
    () => folders.find((folder) => folder.id === selectedFolderId),
    [folders, selectedFolderId],
  );

  async function loadSpaces() {
    setError("");
    setMessage("");
    setLoadingSpaces(true);

    try {
      const data = await getClickUpSpaces();
      setSpaces(data);
      setMessage(data.length ? "Espaces ClickUp charges." : "Aucun espace ClickUp trouve.");

      if (data.length && !selectedSpaceId) {
        setSelectedSpaceId(data[0].id);
      }
    } catch (err) {
      console.error("Load ClickUp spaces error:", err);
      setError(err.response?.data?.detail || "Impossible de charger les espaces ClickUp.");
    } finally {
      setLoadingSpaces(false);
    }
  }

  async function loadFolders(spaceId) {
    if (!spaceId) {
      setFolders([]);
      setFolderlessLists([]);
      return;
    }

    setError("");
    setLoadingFolders(true);

    try {
      const [foldersData, folderlessData] = await Promise.all([
        getClickUpFolders(spaceId),
        getClickUpLists({ spaceId }),
      ]);
      setFolders(foldersData);
      setFolderlessLists(folderlessData);
      setSelectedFolderId(foldersData[0]?.id || "");
    } catch (err) {
      console.error("Load ClickUp folders error:", err);
      setError(err.response?.data?.detail || "Impossible de charger les folders ClickUp.");
      setFolders([]);
      setFolderlessLists([]);
    } finally {
      setLoadingFolders(false);
    }
  }

  async function loadLists(folderId) {
    if (!folderId) {
      setFolderLists([]);
      return;
    }

    setError("");
    setLoadingLists(true);

    try {
      const data = await getClickUpLists({ folderId });
      setFolderLists(data);
    } catch (err) {
      console.error("Load ClickUp lists error:", err);
      setError(err.response?.data?.detail || "Impossible de charger les listes ClickUp.");
      setFolderLists([]);
    } finally {
      setLoadingLists(false);
    }
  }

  async function loadStructure() {
    setError("");
    setLoadingStructure(true);

    try {
      const data = await getClickUpStructure();
      setStructure(data);
    } catch (err) {
      console.error("Load ClickUp structure error:", err);
      setError(err.response?.data?.detail || "Impossible de charger la structure ClickUp.");
      setStructure(null);
    } finally {
      setLoadingStructure(false);
    }
  }

  useEffect(() => {
    loadSpaces();
  }, []);

  useEffect(() => {
    loadFolders(selectedSpaceId);
  }, [selectedSpaceId]);

  useEffect(() => {
    loadLists(selectedFolderId);
  }, [selectedFolderId]);

  return (
    <div className="dashboard-page clickup-page">
      <div className="board-toolbar">
        <div>
          <h2>Structure ClickUp</h2>
          <p>Explorer les espaces, folders et listes ClickUp depuis le backend sécurisé.</p>
        </div>
        <button type="button" className="sync-button" onClick={loadSpaces} disabled={loadingSpaces}>
          <RefreshCw size={16} />
          {loadingSpaces ? "Chargement" : "Actualiser"}
        </button>
      </div>

      {error && <p className="notice is-danger">{error}</p>}
      {message && !error && <p className="notice">{message}</p>}

      <section className="clickup-controls">
        <label>
          <span>Espace</span>
          <select value={selectedSpaceId} onChange={(event) => setSelectedSpaceId(event.target.value)}>
            <option value="">Selectionner un espace</option>
            {spaces.map((space) => (
              <option key={space.id} value={space.id}>
                {space.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Folder</span>
          <select value={selectedFolderId} onChange={(event) => setSelectedFolderId(event.target.value)}>
            <option value="">Selectionner un folder</option>
            {folders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.name}
              </option>
            ))}
          </select>
        </label>

        <button type="button" className="sync-button" onClick={loadStructure} disabled={loadingStructure}>
          <Rows3 size={16} />
          {loadingStructure ? "Analyse" : "Structure complete"}
        </button>
      </section>

      <section className="clickup-grid">
        <article className="workspace-panel">
          <div className="panel-title">
            <h3>Espaces</h3>
            <span>{spaces.length}</span>
          </div>
          <div className="clickup-list">
            {spaces.length === 0 ? (
              <EmptyMessage>Aucun espace ClickUp disponible.</EmptyMessage>
            ) : (
              spaces.map((space) => (
                <button
                  key={space.id}
                  type="button"
                  className={space.id === selectedSpaceId ? "is-selected" : ""}
                  onClick={() => setSelectedSpaceId(space.id)}
                >
                  <FolderKanban size={16} />
                  <span>{space.name}</span>
                </button>
              ))
            )}
          </div>
        </article>

        <article className="workspace-panel">
          <div className="panel-title">
            <h3>Folders {selectedSpace ? `- ${selectedSpace.name}` : ""}</h3>
            <span>{loadingFolders ? "..." : folders.length}</span>
          </div>
          <div className="clickup-list">
            {folders.length === 0 ? (
              <EmptyMessage>Aucun folder trouve pour cet espace.</EmptyMessage>
            ) : (
              folders.map((folder) => (
                <button
                  key={folder.id}
                  type="button"
                  className={folder.id === selectedFolderId ? "is-selected" : ""}
                  onClick={() => setSelectedFolderId(folder.id)}
                >
                  <Rows3 size={16} />
                  <span>{folder.name}</span>
                </button>
              ))
            )}
          </div>
        </article>

        <article className="workspace-panel">
          <div className="panel-title">
            <h3>Listes {selectedFolder ? `- ${selectedFolder.name}` : ""}</h3>
            <span>{loadingLists ? "..." : folderLists.length}</span>
          </div>
          <div className="clickup-list">
            {folderLists.length === 0 ? (
              <EmptyMessage>Aucune liste trouvee dans ce folder.</EmptyMessage>
            ) : (
              folderLists.map((list) => (
                <div key={list.id} className="clickup-row">
                  <ListChecks size={16} />
                  <span>{list.name}</span>
                </div>
              ))
            )}
          </div>
        </article>

        <article className="workspace-panel">
          <div className="panel-title">
            <h3>Listes sans folder</h3>
            <span>{folderlessLists.length}</span>
          </div>
          <div className="clickup-list">
            {folderlessLists.length === 0 ? (
              <EmptyMessage>Aucune liste sans folder pour cet espace.</EmptyMessage>
            ) : (
              folderlessLists.map((list) => (
                <div key={list.id} className="clickup-row">
                  <ListChecks size={16} />
                  <span>{list.name}</span>
                </div>
              ))
            )}
          </div>
        </article>
      </section>

      {structure && (
        <section className="workspace-panel clickup-structure">
          <div className="panel-title">
            <h3>Structure complete</h3>
            <span>{structure.spaces?.length || 0} espaces</span>
          </div>
          <pre>{JSON.stringify(structure, null, 2)}</pre>
        </section>
      )}
    </div>
  );
}

export default ClickUpIntegration;
