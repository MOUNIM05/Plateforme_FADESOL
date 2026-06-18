# Tests et verifications - Fadesol TaskFlow

Ce document regroupe les tests rapides a effectuer apres installation, correction ou demonstration.

## Tests des services health

Verifier que les services repondent :

```text
http://localhost:8000/health
http://localhost:8001/health
http://localhost:8002/health
http://localhost:8003/health
http://localhost:8004/health
http://localhost:8005/health
http://localhost:8006/health
http://localhost:8008/health
```

## Test frontend

Depuis `fadesol-taskflow/frontend` :

```powershell
npm.cmd run build
```

Resultat attendu :

- build Vite termine avec succes ;
- generation du dossier `dist/` ;
- aucune erreur bloquante.

## Test backend

Depuis `fadesol-taskflow` :

```powershell
python -m compileall backend/services
```

Resultat attendu :

- compilation terminee ;
- aucune erreur de syntaxe Python.

## Test Docker Compose

Depuis `fadesol-taskflow` :

```powershell
docker compose config
```

Resultat attendu :

- configuration valide ;
- aucun service manquant ;
- variables attendues resolues.

## Test des roles

Verifier les parcours suivants :

- Administrateur : acces utilisateurs, permissions, services, projets, taches, dashboard.
- Manager : acces aux projets, taches et donnees de son service.
- Employe : acces a ses taches, messages, notifications et profil.

## Test des modules principaux

| Module | Verification |
| --- | --- |
| Authentification | Connexion avec un compte de demonstration. |
| Utilisateurs | Liste, detail, creation ou edition selon permission. |
| Permissions | Modification des droits puis rafraichissement de l'interface. |
| Services | Liste, details, membres et statistiques. |
| Projets | Liste, creation, edition, filtrage. |
| Taches | Creation, affectation, statut, sous-taches. |
| Messagerie | Envoi, reception, lecture, presence. |
| Notifications | Affichage des messages et taches pertinentes. |
| Dashboard | KPI globaux et vues par service. |
| Profil | Affichage profil et upload photo. |

## Test messagerie

1. Se connecter avec deux comptes differents.
2. Ouvrir la messagerie.
3. Envoyer un message.
4. Verifier l'apparition dans la conversation.
5. Verifier le statut lu/non lu.
6. Verifier les notifications.

## Test notifications

1. Ouvrir la page Notifications.
2. Verifier les messages non lus.
3. Verifier les taches affectees.
4. Cliquer sur `Voir`.
5. Confirmer la redirection vers le module concerne.

## Test dashboard

1. Se connecter comme Administrateur.
2. Verifier les KPI globaux.
3. Se connecter comme Manager.
4. Verifier les donnees limitees au service.
5. Se connecter comme Employe.
6. Verifier l'affichage personnel.

## Commandes utiles

```powershell
docker compose ps
docker compose logs api_gateway --tail=100
docker compose logs task_service --tail=100
npm.cmd run build
python -m compileall backend/services
docker compose config
```
