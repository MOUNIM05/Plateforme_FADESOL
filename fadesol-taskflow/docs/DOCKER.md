# Guide Docker - Fadesol TaskFlow

Ce guide explique comment lancer, verifier et diagnostiquer la plateforme avec Docker Compose.

## Prerequis

- Docker Desktop installe.
- Docker Desktop lance.
- Fichier `.env` local present dans `fadesol-taskflow/`.
- Terminal ouvert dans le dossier `fadesol-taskflow`.

## Demarrage

```powershell
docker compose up -d --build
```

Cette commande construit les images puis lance :

- PostgreSQL ;
- pgAdmin ;
- API Gateway ;
- microservices backend ;
- frontend React/Vite.

## Verification des conteneurs

```powershell
docker compose ps
```

Les services doivent etre en etat `running` ou `healthy` selon leur configuration.

## Logs

Logs API Gateway :

```powershell
docker compose logs api_gateway --tail=100
```

Logs Task Service :

```powershell
docker compose logs task_service --tail=100
```

Logs en suivi continu :

```powershell
docker compose logs -f api_gateway
```

## Rebuild

Apres modification de dependances, Dockerfile ou configuration :

```powershell
docker compose up -d --build
```

Rebuild d'un service precis :

```powershell
docker compose up -d --build api_gateway
```

## Arret

```powershell
docker compose down
```

Attention : ne pas utiliser `docker compose down -v` sauf si l'objectif est de supprimer les volumes, y compris les donnees PostgreSQL.

## Validation de la configuration

```powershell
docker compose config
```

Cette commande verifie que le fichier `docker-compose.yml` et les variables attendues sont coherents.

## Healthchecks

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

## pgAdmin

URL :

```text
http://localhost:5050
```

Les identifiants pgAdmin sont lus depuis le fichier `.env` local.

## PostgreSQL

Le service PostgreSQL est expose sur :

```text
localhost:5432
```

Dans le reseau Docker, les microservices utilisent le host :

```text
postgres_db
```

## Commandes utiles

```powershell
docker compose up -d --build
docker compose ps
docker compose logs api_gateway --tail=100
docker compose logs task_service --tail=100
docker compose config
docker compose down
```
