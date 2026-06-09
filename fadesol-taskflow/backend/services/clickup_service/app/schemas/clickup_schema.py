from pydantic import BaseModel


class ClickUpConnectionResponse(BaseModel):
    status: str
    message: str


class ClickUpApiResponse(BaseModel):
    status: str
    message: str
    data: dict | list | None = None


class ClickUpSpaceResponse(BaseModel):
    id: str
    name: str


class ClickUpFolderResponse(BaseModel):
    id: str
    name: str
    space_id: str | None = None


class ClickUpListResponse(BaseModel):
    id: str
    name: str
    folder_id: str | None = None
    space_id: str | None = None


class ClickUpStructureResponse(BaseModel):
    spaces: list[dict]


class ClickUpSyncTaskResponse(BaseModel):
    status: str
    message: str
    task_id: str
    clickup_task_id: str | None = None
