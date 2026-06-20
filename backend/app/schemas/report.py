from decimal import Decimal

from pydantic import BaseModel


class AccountReport(BaseModel):
    account_id: int
    name: str
    type: str
    currency: str
    initial_balance: Decimal
    entry_total: Decimal
    balance: Decimal


class MonthlyReport(BaseModel):
    month: str
    income: Decimal
    expense: Decimal
    net: Decimal


class CategoryReport(BaseModel):
    category_id: int | None
    category_name: str | None
    kind: str
    amount: Decimal
