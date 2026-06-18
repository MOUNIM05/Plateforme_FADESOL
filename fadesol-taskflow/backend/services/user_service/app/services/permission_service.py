"""Logique metier des permissions utilisateur."""

from sqlalchemy.orm import Session

from app.models.user import User
from app.models.user_permission import UserPermission
from app.schemas.permission_schema import PermissionGroup, UserPermissionsResponse, UserPermissionsUpdate
from shared.enums import UserRole
from shared.exceptions import not_found


AVAILABLE_PERMISSION_GROUPS = [
    {
        "module": "Dashboard",
        "permissions": [{"key": "dashboard.view", "label": "Voir le dashboard"}],
    },
    {
        "module": "Utilisateurs",
        "permissions": [
            {"key": "users.view", "label": "Voir les utilisateurs"},
            {"key": "users.create", "label": "Créer un utilisateur"},
            {"key": "users.update", "label": "Modifier un utilisateur"},
            {"key": "users.delete", "label": "Supprimer un utilisateur"},
        ],
    },
    {
        "module": "Services",
        "permissions": [
            {"key": "services.view", "label": "Voir les services"},
            {"key": "services.create", "label": "Ajouter un service"},
            {"key": "services.update", "label": "Modifier un service"},
            {"key": "services.delete", "label": "Supprimer un service"},
        ],
    },
    {
        "module": "Projets",
        "permissions": [
            {"key": "projects.view", "label": "Voir les projets"},
            {"key": "projects.create", "label": "Créer un projet"},
            {"key": "projects.update", "label": "Modifier un projet"},
            {"key": "projects.delete", "label": "Supprimer un projet"},
        ],
    },
    {
        "module": "Tâches",
        "permissions": [
            {"key": "tasks.view", "label": "Voir les tâches"},
            {"key": "tasks.create", "label": "Créer une tâche"},
            {"key": "tasks.update", "label": "Modifier une tâche"},
            {"key": "tasks.delete", "label": "Supprimer une tâche"},
        ],
    },
    {
        "module": "Messagerie",
        "permissions": [
            {"key": "messages.view", "label": "Voir la messagerie"},
            {"key": "messages.send", "label": "Envoyer des messages"},
        ],
    },
    {
        "module": "Rapports",
        "permissions": [{"key": "reports.view", "label": "Voir les rapports"}],
    },
    {
        "module": "Paramètres",
        "permissions": [
            {"key": "settings.view", "label": "Voir les paramètres"},
            {"key": "settings.permissions.manage", "label": "Gérer les permissions"},
        ],
    },
]

# Liste aplatie utilisee pour valider les permissions recues depuis l'interface Admin.
ALL_PERMISSION_KEYS = [
    permission["key"]
    for group in AVAILABLE_PERMISSION_GROUPS
    for permission in group["permissions"]
]

# Permissions par defaut appliquees selon le role avant les eventuelles surcharges utilisateur.
ROLE_DEFAULT_PERMISSIONS = {
    UserRole.ADMIN.value: set(ALL_PERMISSION_KEYS),
    UserRole.MANAGER.value: {
        "dashboard.view",
        "users.view",
        "services.view",
        "projects.view",
        "projects.create",
        "projects.update",
        "tasks.view",
        "tasks.create",
        "tasks.update",
        "messages.view",
        "messages.send",
    },
    UserRole.EMPLOYEE.value: {
        "dashboard.view",
        "tasks.view",
        "messages.view",
        "messages.send",
    },
}


def list_permission_groups() -> list[PermissionGroup]:
    """Retourne le catalogue de permissions regroupe par module."""
    return [PermissionGroup(**group) for group in AVAILABLE_PERMISSION_GROUPS]


def get_user_permissions(db: Session, user: User) -> dict[str, bool]:
    """Calcule les permissions finales d'un utilisateur."""
    # Les droits partent du role, puis les surcharges stockees en base prennent le dessus.
    defaults = ROLE_DEFAULT_PERMISSIONS.get(user.role, set())
    permissions = {key: key in defaults for key in ALL_PERMISSION_KEYS}

    if user.role == UserRole.ADMIN.value:
        # L'administrateur conserve toujours l'ensemble des permissions.
        return {key: True for key in ALL_PERMISSION_KEYS}

    overrides = db.query(UserPermission).filter(UserPermission.user_id == user.id).all()

    for override in overrides:
        if override.permission_key in permissions:
            permissions[override.permission_key] = bool(override.is_allowed)

    return permissions


def get_user_permissions_response(db: Session, user: User) -> UserPermissionsResponse:
    """Construit la reponse API des permissions utilisateur."""
    return UserPermissionsResponse(user_id=user.id, permissions=get_user_permissions(db, user))


def update_user_permissions(db: Session, user: User, payload: UserPermissionsUpdate) -> UserPermissionsResponse:
    """Enregistre les surcharges de permissions pour un utilisateur."""
    # Indexe les permissions existantes afin de mettre a jour sans doublons.
    existing = {
        permission.permission_key: permission
        for permission in db.query(UserPermission).filter(UserPermission.user_id == user.id).all()
    }

    for key, is_allowed in payload.permissions.items():
        # Ignore silencieusement les cles inconnues pour garder un catalogue maitrise.
        if key not in ALL_PERMISSION_KEYS:
            continue

        permission = existing.get(key)

        if permission:
            permission.is_allowed = bool(is_allowed)
        else:
            db.add(UserPermission(user_id=user.id, permission_key=key, is_allowed=bool(is_allowed)))

    db.commit()

    return get_user_permissions_response(db, user)


def get_user_or_404(db: Session, user_id: int) -> User:
    """Recupere un utilisateur ou leve une erreur lisible pour l'API."""
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise not_found("Utilisateur introuvable.")

    return user
