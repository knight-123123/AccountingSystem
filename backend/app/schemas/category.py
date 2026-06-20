from datetime import datetime

from pydantic import BaseModel, ConfigDict


class CategoryBase(BaseModel):
    name: str
    type: str
    parent_id: int | None = None
    sort_order: int = 0
    is_active: bool = True


class CategoryCreate(CategoryBase):
    user_id: int


class CategoryUpdate(BaseModel):
    name: str | None = None
    type: str | None = None
    parent_id: int | None = None
    sort_order: int | None = None
    is_active: bool | None = None


class CategoryRead(CategoryBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime
