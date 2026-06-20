from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, model_validator


class TransactionCreate(BaseModel):
    user_id: int
    kind: Literal["income", "expense", "transfer"]
    amount: Decimal
    currency: str = "CNY"
    category_id: int | None = None
    occurred_on: date
    merchant: str | None = None
    note: str | None = None
    account_id: int | None = None
    from_account_id: int | None = None
    to_account_id: int | None = None

    @model_validator(mode="after")
    def validate_entries(self) -> "TransactionCreate":
        if self.amount <= Decimal("0"):
            raise ValueError("amount must be greater than 0")

        if self.kind in {"income", "expense"} and self.account_id is None:
            raise ValueError("account_id is required for income and expense")

        if self.kind == "transfer":
            if self.from_account_id is None or self.to_account_id is None:
                raise ValueError("from_account_id and to_account_id are required for transfer")
            if self.from_account_id == self.to_account_id:
                raise ValueError("from_account_id and to_account_id must be different")

        return self


class TransactionEntryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    account_id: int
    amount: Decimal
    currency: str
    created_at: datetime


class TransactionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    kind: str
    category_id: int | None
    occurred_on: date
    merchant: str | None
    note: str | None
    created_at: datetime
    updated_at: datetime
    entries: list[TransactionEntryRead]
