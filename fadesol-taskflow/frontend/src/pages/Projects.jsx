import { useEffect, useMemo, useState } from "react";
import { FolderKanban, Plus, RefreshCw } from "lucide-react";
import { createProject, getProjects } from "../services/projectService";
import { getServices } from "../services/serviceService";

const emptyProject = {
  titre: "",
  description: "",
  service_id: "",
  responsable_id: "",
  priorite: "Normale",
  date_debut: "",
  date_limite: "",
};

function normalizeProjectPayload(formData) {
  return {
    titre: formData.titre.trim(),
    description: formData.description.trim() || null,
    service_id: formData.service_id,
    responsable_id: formData.responsable_id.trim() || null,
    priorite: formData.priorite,
    date_debut: formData.date_debut || null,
    date_limite: formData.date_limite || null,
    statut: "Nouveau",
    progression: 0,
  };
}

function Projects() {
  const [projects, setProjects] = useState([]);
  const [services, setServices] = useState([]);
  const [formData, setFormData] = useState(emptyProject);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [projectData, serviceData] = await Promise.all([getProjects(), getServices()]);
      setProjects(projectData);
      setServices(serviceData);
      setFormData((current) => ({
        ...current,
        service_id: current.service_id || serviceData[0]?.id || "",
      }));
    } catch (err) {
      console.error("Load projects error:", err);
      setError("Impossible de charger les projets ou les services.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    Promise.all([getProjects(), getServices()])
      .then(([projectData, serviceData]) => {
        if (!isMounted) {
          return;
        }

        setProjects(projectData);
        setServices(serviceData);
        setFormData((current) => ({
          ...current,
          service_id: current.service_id || serviceData[0]?.id || "",
        }));
      })
      .catch((err) => {
        console.error("Load projects error:", err);
        if (isMounted) {
          setError("Impossible de charger les projets ou les services.");
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const serviceById = useMemo(() => {
    return services.reduce((acc, service) => {
      acc[service.id] = service.name;
      return acc;
    }, {});
  }, [services]);

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);

    try {
      const createdProject = await createProject(normalizeProjectPayload(formData));
      setProjects((current) => [createdProject, ...current]);
      setFormData({
        ...emptyProject,
        service_id: services[0]?.id || "",
      });
      setMessage("Projet créé avec succès.");
    } catch (err) {
      console.error("Create project error:", err);
      setError(err.response?.data?.detail || "Erreur pendant la création du projet.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="dashboard-page projects-page">
      <div className="board-toolbar">
        <div>
          <h2>Création d'un projet</h2>
          <p>Créer un projet Fadesol et l'associer à un service existant.</p>
        </div>
        <button type="button" className="secondary-action" onClick={loadData}>
          <RefreshCw size={17} />
          Actualiser
        </button>
      </div>

      {message && <p className="notice success">{message}</p>}
      {error && <p className="notice error">{error}</p>}

      <section className="management-grid">
        <form className="workspace-panel user-form project-form" onSubmit={handleSubmit}>
          <div className="panel-title">
            <h3>Nouveau projet</h3>
            <span>US11</span>
          </div>

          <div className="form-grid">
            <label>
              Titre
              <input
                name="titre"
                value={formData.titre}
                onChange={handleChange}
                placeholder="Ex: Installation solaire client"
                required
              />
            </label>

            <label>
              Description
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Objectif, contexte et périmètre du projet"
                rows={5}
              />
            </label>

            <label>
              Service
              <select
                name="service_id"
                value={formData.service_id}
                onChange={handleChange}
                required
              >
                <option value="">Sélectionner un service</option>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Responsable
              <input
                name="responsable_id"
                value={formData.responsable_id}
                onChange={handleChange}
                placeholder="ID utilisateur optionnel"
              />
            </label>

            <label>
              Priorité
              <select name="priorite" value={formData.priorite} onChange={handleChange}>
                <option value="Faible">Faible</option>
                <option value="Normale">Normale</option>
                <option value="Haute">Haute</option>
                <option value="Urgente">Urgente</option>
              </select>
            </label>

            <label>
              Date début
              <input name="date_debut" type="date" value={formData.date_debut} onChange={handleChange} />
            </label>

            <label>
              Date limite
              <input name="date_limite" type="date" value={formData.date_limite} onChange={handleChange} />
            </label>
          </div>

          <button type="submit" className="primary-action" disabled={saving || !services.length}>
            <Plus size={17} />
            {saving ? "Création..." : "Créer projet"}
          </button>
        </form>

        <section className="workspace-panel user-list-panel">
          <div className="panel-title">
            <h3>Projets créés</h3>
            <span>{projects.length} projet(s)</span>
          </div>

          {loading && <p className="loading-line">Chargement des projets...</p>}

          {!loading && projects.length === 0 && (
            <div className="empty-table">
              <FolderKanban size={34} />
              <strong>Aucun projet</strong>
              <p>Créez votre premier projet avec le formulaire.</p>
            </div>
          )}

          {!loading && projects.length > 0 && (
            <div className="project-list">
              {projects.map((project) => (
                <article key={project.id}>
                  <div>
                    <strong>{project.titre}</strong>
                    <span>{serviceById[project.service_id] || project.service_id}</span>
                  </div>
                  <mark>{project.statut}</mark>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </div>
  );
}

export default Projects;
