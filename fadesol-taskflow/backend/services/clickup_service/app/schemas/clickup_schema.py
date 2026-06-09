from pydantic import BaseModel


class ClickUpConnectionResponse(BaseModel):
    status: str
    message: str


class ClickUpApiResponse(BaseModel):
    status: str
    message: str
    data: dict | list | None = None
