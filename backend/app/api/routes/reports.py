from collections import defaultdict
from decimal import Decimal

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.account import Account
from app.models.category import Category
from app.models.transaction import Transaction, TransactionEntry
from app.schemas.report import AccountReport, CategoryReport, MonthlyReport

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/accounts", response_model=list[AccountReport])
def report_accounts(db: Session = Depends(get_db)) -> list[AccountReport]:
    accounts = list(db.scalars(select(Account).order_by(Account.id)).all())
    rows = db.execute(
        select(TransactionEntry.account_id, TransactionEntry.amount)
    ).all()

    entry_totals: dict[int, Decimal] = defaultdict(lambda: Decimal("0.00"))
    for account_id, amount in rows:
        entry_totals[account_id] += amount

    return [
        AccountReport(
            account_id=account.id,
            name=account.name,
            type=account.type,
            currency=account.currency,
            initial_balance=account.initial_balance,
            entry_total=entry_totals[account.id],
            balance=account.initial_balance + entry_totals[account.id],
        )
        for account in accounts
    ]


@router.get("/monthly", response_model=list[MonthlyReport])
def report_monthly(db: Session = Depends(get_db)) -> list[MonthlyReport]:
    rows = db.execute(
        select(Transaction.occurred_on, Transaction.kind, TransactionEntry.amount)
        .join(TransactionEntry, TransactionEntry.transaction_id == Transaction.id)
        .where(Transaction.kind.in_(["income", "expense"]))
    ).all()

    monthly: dict[str, dict[str, Decimal]] = defaultdict(
        lambda: {"income": Decimal("0.00"), "expense": Decimal("0.00")}
    )
    for occurred_on, kind, amount in rows:
        month = occurred_on.strftime("%Y-%m")
        if kind == "income":
            monthly[month]["income"] += amount
        elif kind == "expense":
            monthly[month]["expense"] += -amount

    return [
        MonthlyReport(
            month=month,
            income=totals["income"],
            expense=totals["expense"],
            net=totals["income"] - totals["expense"],
        )
        for month, totals in sorted(monthly.items())
    ]


@router.get("/categories", response_model=list[CategoryReport])
def report_categories(db: Session = Depends(get_db)) -> list[CategoryReport]:
    rows = db.execute(
        select(
            Transaction.category_id,
            Category.name,
            Transaction.kind,
            TransactionEntry.amount,
        )
        .join(TransactionEntry, TransactionEntry.transaction_id == Transaction.id)
        .outerjoin(Category, Category.id == Transaction.category_id)
        .where(Transaction.kind.in_(["income", "expense"]))
    ).all()

    totals: dict[tuple[int | None, str | None, str], Decimal] = defaultdict(
        lambda: Decimal("0.00")
    )
    for category_id, category_name, kind, amount in rows:
        key = (category_id, category_name, kind)
        totals[key] += amount if kind == "income" else -amount

    return [
        CategoryReport(
            category_id=category_id,
            category_name=category_name,
            kind=kind,
            amount=amount,
        )
        for (category_id, category_name, kind), amount in sorted(
            totals.items(),
            key=lambda item: (item[0][2], item[0][1] or "", item[0][0] or 0),
        )
    ]
