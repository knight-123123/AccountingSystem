from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class AccountBase(BaseModel):
    name: str
    type: str
    currency: str = "CNY"
    initial_balance: Decimal = Decimal("0.00")
    is_active: bool = True


class AccountCreate(AccountBase):
    user_id: int


class AccountUpdate(BaseModel):
    name: str | None = None
    type: str | None = None
    currency: str | None = None
    initial_balance: Decimal | None = None
    is_active: bool | None = None


class AccountRead(AccountBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime
