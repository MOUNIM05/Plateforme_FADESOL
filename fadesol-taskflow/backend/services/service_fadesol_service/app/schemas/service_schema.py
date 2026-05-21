from datetime import datetime

from pydantic import BaseModel


class ServiceBase(BaseModel):
    name: str
    description: str | None = None
    manager_id: str | None = None
    is_active: bool = True


class ServiceCreate(ServiceBase):
    pass


class ServiceUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    manager_id: str | None = None
    is_active: bool | None = None


class ServiceResponse(ServiceBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True


class ServiceMemberResponse(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: str
    role: str
    service_id: str | None = None
    service: str | None = None
    is_active: bool = True


class ServiceMembersResponse(BaseModel):
    service_id: str
    service_name: str
    total_members: int
    members: list[ServiceMemberResponse]


class ServiceStatisticsResponse(BaseModel):
    service_id: str
    service_name: str
    total_members: int
    active_members: int
    inactive_members: int
    total_projects: int = 0
    total_tasks: int = 0
    completed_tasks: int = 0
    pending_tasks: int = 0

    class Config:
        from_attributes = True
