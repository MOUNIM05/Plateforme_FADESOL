"""Modele ORM des permissions utilisateur."""

from sqlalchemy import Boolean, Column, DateTime, Integer, String, UniqueConstraint
from sqlalchemy.sql import func

from app.db.database import Base


class UserPermission(Base):
    """Permission fonctionnelle accordee ou retiree a un utilisateur."""

    __tablename__ = "user_permissions"
    __table_args__ = (UniqueConstraint("user_id", "permission_key", name="uq_user_permission_key"),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True, nullable=False)
    permission_key = Column(String(120), index=True, nullable=False)
    is_allowed = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
