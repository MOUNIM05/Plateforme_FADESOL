# Frontend - Fadesol TaskFlow

Le frontend est l'interface web de Fadesol TaskFlow. Il permet aux utilisateurs de se connecter, consulter leurs tableaux de bord, gerer les projets, suivre les taches, utiliser la messagerie interne et administrer les utilisateurs selon leurs permissions.

## Technologies

- React.
- Vite.
- Tailwind CSS.
- Axios.
- React Router.
- Lucide React pour les icones.

## Installation

Depuis `fadesol-taskflow/frontend` :

```powershell
npm install
```

## Lancement local

```powershell
npm.cmd run dev -- --host 0.0.0.0
```

URL par defaut :

```text
http://localhost:5173
```

## Build de production

```powershell
npm.cmd run build
```

Le build genere le dossier `dist/`, qui ne doit pas etre versionne.

## Structure `src`

```text
src/
|-- components/
|-- context/
|-- layouts/
|-- pages/
|-- routes/
|-- services/
|-- styles/
|-- utils/
|-- App.jsx
`-- main.jsx
```

## Pages principales

- `LoginPage` : connexion utilisateur.
- `Dashboard` : redirection vers le dashboard adapte au role.
- `Users` : gestion des utilisateurs.
- `Permissions` : gestion des permissions.
- `Services` : gestion des services FADESOL.
- `Projects` : gestion des projets.
- `Tasks` : gestion des taches, sous-taches et pieces jointes.
- `MyTasks` : taches affectees a l'utilisateur connecte.
- `Messages` : messagerie interne.
- `Notifications` : activites recentes.
- `Profile` : profil et photo utilisateur.
- `Settings` et `UserSettings` : parametres.

## Services API

Les fichiers dans `src/services/` centralisent les appels vers l'API Gateway :

- `api.js` : instance Axios, URL API et injection du token JWT.
- `authService.js` : login et utilisateur courant.
- `userService.js` : utilisateurs, profil, permissions.
- `serviceService.js` et `serviceFadesolService.js` : services internes.
- `projectService.js` : projets.
- `taskService.js` : taches, sous-taches, pieces jointes.
- `messageService.js` : messages, conversations et WebSocket.
- `dashboardService.js` : indicateurs dashboard.

## AuthContext

`src/context/AuthContext.jsx` gere :

- le token JWT stocke dans `localStorage` ;
- le profil utilisateur courant ;
- les roles standardises ;
- les permissions ;
- la connexion et la deconnexion ;
- le rafraichissement des droits apres modification.

## Routes protegees

- `ProtectedRoute.jsx` bloque l'acces si l'utilisateur n'est pas connecte.
- `RoleRoute.jsx` controle les roles et permissions pour les modules sensibles.

## Notes UI/UX

- Les pages sont organisees par module metier.
- Les actions sensibles sont affichees selon les permissions.
- Les notifications et messages se mettent a jour via evenements frontend et WebSocket.
- Les formulaires utilisent des messages d'erreur lisibles pour l'utilisateur.

## Commandes utiles

```powershell
npm install
npm.cmd run dev -- --host 0.0.0.0
npm.cmd run build
```
