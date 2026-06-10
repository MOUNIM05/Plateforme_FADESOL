# ClickUp Service

Microservice responsable de l'integration entre Fadesol TaskFlow et ClickUp API.

Ce service garde le token ClickUp cote backend, expose des routes pour lire la structure
ClickUp et synchronise les taches internes vers une liste ClickUp configuree.

Routes principales:

- `GET /health` : verifier que le service est disponible.
- `GET /clickup/test-connection` : tester la connexion ClickUp sans exposer le token.
- `GET /clickup/spaces` : recuperer les espaces ClickUp du workspace configure.
- `GET /clickup/folders` : recuperer les folders d'un espace.
- `GET /clickup/lists` : recuperer les listes d'un folder ou d'un espace.
- `GET /clickup/structure` : afficher l'arborescence spaces/folders/lists.
- `POST /clickup/sync-task/{task_id}` : creer une tache dans ClickUp et sauvegarder son id cote task_service.

Variables importantes:

- `CLICKUP_TOKEN` : token personnel ClickUp, jamais retourne par l'API.
- `CLICKUP_API_BASE_URL` : URL de base de ClickUp API.
- `CLICKUP_WORKSPACE_ID` : workspace/team ClickUp.
- `CLICKUP_SPACE_ID` : espace ClickUp par defaut.
- `CLICKUP_FOLDER_ID` : folder ClickUp par defaut.
- `CLICKUP_LIST_ID` : liste ou les taches synchronisees sont creees.
- `TASK_SERVICE_URL` : URL interne du microservice des taches.

Commande de verification:

```powershell
uvicorn app.main:app --reload --port 8007
```
