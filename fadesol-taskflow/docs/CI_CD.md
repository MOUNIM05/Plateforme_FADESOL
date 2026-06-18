# CI/CD - Fadesol TaskFlow

La CI/CD du projet est geree avec GitHub Actions.

## Fichier workflow

Le workflow principal est :

```text
.github/workflows/ci.yml
```

Dans ce repository, le fichier doit etre place a la racine GitHub du depot, pas dans un sous-dossier.

## Role de GitHub Actions

GitHub Actions verifie automatiquement que les parties principales du projet restent valides apres un push ou une pull request.

## Jobs du pipeline

| Job | Role |
| --- | --- |
| Frontend Build | Installe les dependances frontend et execute le build Vite. |
| Backend Compile Check | Compile les services FastAPI avec `python -m compileall`. |
| Docker Compose Config Check | Valide la configuration Docker Compose. |

## Frontend Build

Le job frontend execute :

```powershell
npm install
npm run build
```

Il permet de detecter :

- erreurs React ;
- erreurs d'import ;
- erreurs Vite ;
- erreurs de build.

## Backend Compile Check

Le job backend execute :

```powershell
python -m compileall fadesol-taskflow/backend/services
```

Il permet de detecter :

- erreurs de syntaxe Python ;
- imports invalides au moment de la compilation ;
- fichiers backend incomplets.

## Docker Compose Config Check

Le job Docker execute :

```powershell
docker compose config
```

Il permet de verifier :

- la syntaxe du fichier `docker-compose.yml` ;
- les variables d'environnement attendues ;
- la coherence des services, ports, volumes et healthchecks.

## Pourquoi le fichier `.env` n'est pas pousse

Le fichier `.env` contient des valeurs sensibles ou propres a l'environnement local :

- mots de passe ;
- secrets JWT ;
- URLs internes ;
- variables de base de donnees.

Il doit rester ignore par Git. Seul `.env.example` doit documenter les variables attendues.

## Fichier `.env` temporaire en CI

Le workflow cree un fichier `.env` temporaire pendant le job Docker Compose. Ce fichier existe uniquement dans le runner GitHub Actions et sert a valider la configuration Docker sans exposer de secrets reels.

## Lire les erreurs CI

1. Ouvrir GitHub.
2. Aller dans l'onglet `Actions`.
3. Choisir le workflow echoue.
4. Ouvrir le job rouge.
5. Lire la premiere etape en erreur.
6. Corriger le fichier concerne.
7. Relancer par commit/push.

## Bonnes pratiques

- Garder `.github/workflows/ci.yml` a la racine du depot.
- Ne pas versionner `.env`.
- Ajouter les variables sensibles dans les settings GitHub si un deploiement les exige.
- Garder les jobs simples et lisibles.
