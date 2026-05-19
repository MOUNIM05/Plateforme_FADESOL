from datetime import datetime

from pydantic import BaseModel


class ServiceBase(BaseModel):
    nom: str
    description: str | None = None
    manager_id: str | None = None


class ServiceCreate(ServiceBase):
    pass


class ServiceUpdate(BaseModel):
    nom: str | None = None
    description: str | None = None
    manager_id: str | None = None


class ServiceResponse(ServiceBase):
    id: str
    date_creation: datetime

    class Config:
        from_attributes = True
