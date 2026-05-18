from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies import require_roles
from app.modules.users import service
from app.modules.users.schemas import UserCreate, UserResponse, UserUpdate
from app.shared.constants import UserRole


# Router خاص بعمليات المستخدمين.
# prefix="/users" يعني جميع routes هنا غادي يبدأو بـ /users.
# main.py كيزيد عليهم /api، يعني النهاية كتولي /api/users.
router = APIRouter(
    prefix="/users",
    tags=["Users"],
)


@router.post("/", response_model=UserResponse)
def create_user(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(UserRole.ADMIN)),
):
    """
    Créer un nouvel utilisateur.

    Cette route permet d'ajouter un utilisateur dans la base de données.
    Le mot de passe sera hashé dans la couche CRUD avant stockage.

    Permission :
    seul l'Administrateur peut créer des utilisateurs.
    """
    return service.create_user_service(db, user_data)


@router.get("/", response_model=list[UserResponse])
def list_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER)),
):
    """
    Afficher la liste des utilisateurs.

    skip et limit permettent une pagination simple.

    Permission :
    l'Administrateur et le Manager peuvent consulter les utilisateurs.
    """
    return service.get_users_service(db, skip, limit)


@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER)),
):
    """
    Afficher les détails d'un utilisateur par son ID.

    Permission :
    l'Administrateur et le Manager peuvent consulter les détails.
    """
    return service.get_user_service(db, user_id)


@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    user_data: UserUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(UserRole.ADMIN)),
):
    """
    Modifier les informations d'un utilisateur.

    Permission :
    seul l'Administrateur peut modifier les utilisateurs.
    """
    return service.update_user_service(db, user_id, user_data)


@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(require_roles(UserRole.ADMIN)),
):
    """
    Supprimer un utilisateur par son ID.

    Permission :
    seul l'Administrateur peut supprimer des utilisateurs.
    Pendant les tests, il ne faut pas supprimer le compte Admin principal.
    """
    return service.delete_user_service(db, user_id)
